// 飞行棋规则引擎（15x15 十字棋盘，四色，掷 6 起飞，同色格跳跃，飞行捷径，撞子回营）
// 棋子进度 prog：-1 在机场；0..50 在外圈（0 为起飞点）；51..55 终点通道；56 到达
(function (root) {
  'use strict';
  const COLORS = ['red', 'yellow', 'blue', 'green'];
  const COLOR_NAMES = ['红', '黄', '蓝', '绿'];
  const FINISH = 56, LAST_TRACK = 50, JUMP = 4, FLY_FROM = 16, FLY_TO = 28;
  // 外圈 52 格坐标（顺时针）
  const TRACK = (() => {
    const t = [];
    for (let x = 1; x <= 5; x++) t.push([x, 6]);
    for (let y = 5; y >= 0; y--) t.push([6, y]);
    t.push([7, 0]);
    for (let y = 0; y <= 5; y++) t.push([8, y]);
    for (let x = 9; x <= 14; x++) t.push([x, 6]);
    t.push([14, 7]);
    for (let x = 14; x >= 9; x--) t.push([x, 8]);
    for (let y = 9; y <= 14; y++) t.push([8, y]);
    t.push([7, 14]);
    for (let y = 14; y >= 9; y--) t.push([6, y]);
    for (let x = 5; x >= 0; x--) t.push([x, 8]);
    t.push([0, 7]); t.push([0, 6]);
    return t;
  })();
  const abs = (p, prog) => (13 * p + prog) % 52;
  // 第 p 家进度 prog 所在格坐标（机场与终点由界面单独处理）
  function cellOf(p, prog) {
    if (prog >= 0 && prog <= LAST_TRACK) return TRACK[abs(p, prog)];
    if (prog > LAST_TRACK && prog < FINISH) {
      const [x, y] = TRACK[abs(p, LAST_TRACK)], dx = Math.sign(7 - x), dy = Math.sign(7 - y), k = prog - LAST_TRACK;
      return [x + dx * k, y + dy * k];
    }
    return [7, 7];
  }
  const trackColor = i => i % 4; // 外圈格颜色：起飞点正好是本色

  function newGame(seats) {
    // seats: 每家 'human' | 'ai' | null(不参加)
    return {
      seats, turn: seats.findIndex(s => s), dice: 0, sixes: 0, winner: -1, rank: [],
      pieces: COLORS.map(() => [-1, -1, -1, -1]),
    };
  }
  function movable(g, p, dice) {
    const out = [];
    g.pieces[p].forEach((prog, i) => {
      if (prog === FINISH) return;
      if (prog === -1) { if (dice === 6) out.push(i); return; }
      out.push(i);
    });
    return out;
  }
  // 计算移动结果（不修改原局面）：返回路径与撞回的子
  function plan(g, p, i, dice) {
    const start = g.pieces[p][i], steps = [];
    let prog;
    if (start === -1) { prog = 0; steps.push(0); }
    else {
      prog = start;
      for (let k = 0; k < dice; k++) { prog = prog + 1 > FINISH ? prog : prog + 1; steps.push(prog); }
      // 超出终点则反弹
      const over = start + dice - FINISH;
      if (over > 0) { steps.length = 0; prog = start; for (let k = 0; k < dice; k++) { prog += k < dice - over ? 1 : -1; steps.push(prog); } }
    }
    const bumps = [];
    const landOn = q => {
      if (q < 0 || q > LAST_TRACK) return;
      const a = abs(p, q);
      g.pieces.forEach((arr, op) => { if (op === p || !g.seats[op]) return; arr.forEach((pr, j) => { if (pr >= 0 && pr <= LAST_TRACK && abs(op, pr) === a) bumps.push([op, j]); }); });
    };
    let jumped = false, flew = false;
    if (start !== -1 && prog <= LAST_TRACK) {
      landOn(prog);
      if (prog % 4 === 0) {
        if (prog === FLY_FROM) { prog = FLY_TO; flew = true; steps.push(prog); landOn(prog); }
        else if (prog + JUMP <= LAST_TRACK) {
          prog += JUMP; jumped = true; steps.push(prog); landOn(prog);
          if (prog === FLY_FROM) { prog = FLY_TO; flew = true; steps.push(prog); landOn(prog); }
        }
      }
    } else if (start === -1) landOn(0);
    const uniq = []; const seen = new Set();
    for (const b of bumps) { const k = b.join(','); if (!seen.has(k)) { seen.add(k); uniq.push(b); } }
    return { from: start, to: prog, steps, bumps: uniq, jumped, flew };
  }
  function apply(g, p, i, dice) {
    const r = plan(g, p, i, dice);
    g.pieces[p][i] = r.to;
    for (const [op, j] of r.bumps) g.pieces[op][j] = -1;
    if (g.pieces[p].every(x => x === FINISH) && !g.rank.includes(p)) { g.rank.push(p); if (g.winner < 0) g.winner = p; }
    return r;
  }
  // 掷骰后轮转：6 点可再掷一次（连续三次 6 则结束本轮）
  function nextTurn(g, dice) {
    const active = g.seats.map((s, i) => (s && !g.rank.includes(i) ? i : -1)).filter(i => i >= 0);
    if (active.length <= 1) return false;
    if (dice === 6 && g.sixes < 2 && !g.rank.includes(g.turn)) { g.sixes++; return true; }
    g.sixes = 0;
    let t = g.turn;
    do { t = (t + 1) % 4; } while (!g.seats[t] || g.rank.includes(t));
    g.turn = t;
    return true;
  }
  // AI：到达 > 撞子 > 起飞 > 跳/飞 > 进终点通道 > 避险 > 前进
  function aiChoose(g, p, dice) {
    const opts = movable(g, p, dice);
    if (!opts.length) return -1;
    let best = opts[0], bestV = -Infinity;
    for (const i of opts) {
      const r = plan(g, p, i, dice);
      let v = 0;
      if (r.to === FINISH) v += 1000;
      v += r.bumps.length * 600;
      if (r.from === -1) v += 450;
      if (r.flew) v += 300; else if (r.jumped) v += 150;
      if (r.from <= LAST_TRACK && r.to > LAST_TRACK) v += 250;
      v += (r.to - Math.max(r.from, 0)) * 3;
      if (r.to >= 0 && r.to <= LAST_TRACK) v -= danger(g, p, r.to) * 120;
      if (r.from >= 0 && r.from <= LAST_TRACK) v += danger(g, p, r.from) * 80;
      v += Math.random() * 5;
      if (v > bestV) { bestV = v; best = i; }
    }
    return best;
  }
  // 有多少敌子在身后 1..6 格内
  function danger(g, p, prog) {
    const a = abs(p, prog); let n = 0;
    g.pieces.forEach((arr, op) => {
      if (op === p || !g.seats[op]) return;
      arr.forEach(pr => { if (pr >= 0 && pr <= LAST_TRACK) { const d = (a - abs(op, pr) + 52) % 52; if (d >= 1 && d <= 6) n++; } });
    });
    return n;
  }
  root.FeixingqiEngine = { COLORS, COLOR_NAMES, TRACK, FINISH, LAST_TRACK, FLY_FROM, FLY_TO, abs, cellOf, trackColor, newGame, movable, plan, apply, nextTurn, aiChoose };
})(typeof self !== 'undefined' ? self : globalThis);
