// 跳棋（中国跳棋）引擎：121 孔六角星棋盘，立方坐标 (x,y,z)，x+y+z=0
// 每家 10 子，从本营走到对面营地；可走一步，或隔一子连续跳跃
(function (root) {
  'use strict';
  const DIRS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];
  const cells = [], index = new Map();
  for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) {
    const z = -x - y;
    if (z < -8 || z > 8) continue;
    const up = x >= -4 && y >= -4 && z >= -4, down = x <= 4 && y <= 4 && z <= 4;
    if (!up && !down) continue;
    index.set(x + ',' + y + ',' + z, cells.length);
    cells.push({ x, y, z, px: x + z / 2, py: z * Math.sqrt(3) / 2 });
  }
  const id = (x, y, z) => { const v = index.get(x + ',' + y + ',' + z); return v === undefined ? -1 : v; };
  const nbr = cells.map(c => DIRS.map(([dx, dy, dz]) => id(c.x + dx, c.y + dy, c.z + dz)));
  // 六个角（营地），按屏幕角度从正下方起顺时针排序
  const ARM_TESTS = [c => c.z >= 5, c => c.z <= -5, c => c.x >= 5, c => c.x <= -5, c => c.y >= 5, c => c.y <= -5];
  const arms = ARM_TESTS.map(t => cells.map((c, i) => (t(c) ? i : -1)).filter(i => i >= 0));
  const angleOf = a => { const cx = a.reduce((s, i) => s + cells[i].px, 0) / a.length, cy = a.reduce((s, i) => s + cells[i].py, 0) / a.length; return (Math.atan2(cx, cy) * 180 / Math.PI + 360) % 360; };
  const ARMS = arms.map(a => ({ cells: a, ang: angleOf(a) })).sort((a, b) => a.ang - b.ang).map(a => a.cells);
  // ARMS[0] 在正下方，ARMS[k] 的对面是 ARMS[(k+3)%6]
  const tipOf = arm => arm.reduce((best, i) => (Math.max(Math.abs(cells[i].x), Math.abs(cells[i].y), Math.abs(cells[i].z)) === 8 ? i : best), arm[0]);
  const TIPS = ARMS.map(tipOf);
  const dist = (a, b) => { const A = cells[a], B = cells[b]; return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y), Math.abs(A.z - B.z)); };
  const LAYOUTS = { 2: [0, 3], 3: [0, 2, 4], 4: [1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

  function newGame(seats) {
    // seats: [{arm, kind:'human'|'ai'}]
    const occ = new Array(cells.length).fill(-1);
    seats.forEach((s, p) => ARMS[s.arm].forEach(i => (occ[i] = p)));
    return { occ, seats, turn: 0, winner: -1, moves: 0 };
  }
  const targetArm = (g, p) => ARMS[(g.seats[p].arm + 3) % 6];
  // 一个子所有可达落点：{to, path}
  function reach(g, from) {
    const out = [], occ = g.occ;
    for (const n of nbr[from]) if (n >= 0 && occ[n] < 0) out.push({ to: n, path: [from, n] });
    const seen = new Set([from]), queue = [[from, [from]]];
    while (queue.length) {
      const [c, path] = queue.shift();
      for (let d = 0; d < 6; d++) {
        const over = nbr[c][d]; if (over < 0 || occ[over] < 0) continue;
        const land = nbr[over][d]; if (land < 0 || occ[land] >= 0 || land === from || seen.has(land)) continue;
        seen.add(land); const np = path.concat(land);
        out.push({ to: land, path: np }); queue.push([land, np]);
      }
    }
    return out;
  }
  function allMoves(g, p) {
    const res = [];
    g.occ.forEach((o, i) => { if (o === p) for (const m of reach(g, i)) res.push({ from: i, to: m.to, path: m.path }); });
    return res;
  }
  function apply(g, m) {
    const p = g.occ[m.from]; g.occ[m.to] = p; g.occ[m.from] = -1; g.moves++;
    if (targetArm(g, p).every(i => g.occ[i] === p)) g.winner = p;
    g.turn = (g.turn + 1) % g.seats.length;
  }
  function progress(g, p) { const tip = TIPS[(g.seats[p].arm + 3) % 6]; let s = 0; g.occ.forEach((o, i) => { if (o === p) s += dist(i, tip); }); return s; }
  // AI：前进距离为主，照顾落后棋子，进入目标营后不再离开；两步推演
  function scoreMove(g, p, m, tset, tip) {
    const d0 = dist(m.from, tip), d1 = dist(m.to, tip);
    let v = d0 - d1;
    if (tset.has(m.from) && !tset.has(m.to)) v -= 20;
    if (!tset.has(m.from) && tset.has(m.to)) v += 2;
    v += d0 * 0.08;                         // 优先移动落后的子
    const c = cells[m.to], tc = cells[tip]; // 靠近中线
    v -= (Math.abs((c.px - tc.px)) * 0.05);
    return v;
  }
  function aiMove(g, p) {
    const tset = new Set(targetArm(g, p)), tip = TIPS[(g.seats[p].arm + 3) % 6];
    const ms = allMoves(g, p); if (!ms.length) return null;
    const scored = ms.map(m => ({ m, v: scoreMove(g, p, m, tset, tip) })).sort((a, b) => b.v - a.v).slice(0, 12);
    let best = scored[0].m, bestV = -Infinity;
    for (const { m, v } of scored) {
      g.occ[m.to] = p; g.occ[m.from] = -1;
      let follow = 0;
      for (const m2 of allMoves(g, p)) follow = Math.max(follow, scoreMove(g, p, m2, tset, tip));
      g.occ[m.from] = p; g.occ[m.to] = -1;
      const total = v + follow * 0.6 + Math.random() * 0.01;
      if (total > bestV) { bestV = total; best = m; }
    }
    return best;
  }
  root.TiaoqiEngine = { cells, nbr, ARMS, TIPS, LAYOUTS, newGame, reach, allMoves, apply, aiMove, targetArm, progress, dist };
})(typeof self !== 'undefined' ? self : globalThis);
