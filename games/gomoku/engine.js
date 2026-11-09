// 五子棋引擎：15x15，黑先，连成五子（含以上）获胜；AI 为棋型评分 + 困难档两层推演
(function (root) {
  'use strict';
  const N = 15, DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  // 棋型：1=己方 2=对方或边界 0=空
  const PATS = [
    ['11111', 1e7],
    ['011110', 1e5],
    ['011112', 1e4], ['211110', 1e4], ['10111', 1e4], ['11101', 1e4], ['11011', 1e4],
    ['001110', 3e3], ['011100', 3e3], ['010110', 3e3], ['011010', 3e3],
    ['01110', 400], ['001112', 300], ['211100', 300], ['010112', 300], ['211010', 300], ['011012', 300], ['210110', 300],
    ['10011', 300], ['11001', 300], ['10101', 300],
    ['00110', 100], ['01100', 100], ['01010', 100], ['010010', 100],
    ['000112', 10], ['211000', 10], ['001012', 10], ['210100', 10], ['010012', 10], ['210010', 10], ['10001', 10],
  ];
  const at = (b, x, y) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : b[y * N + x]);

  // 在 (x,y) 落 who 子后，某方向上覆盖该点的最好棋型分
  function dirScore(b, x, y, dx, dy, who) {
    let s = '';
    for (let k = -5; k <= 5; k++) {
      if (k === 0) { s += '1'; continue; }
      const v = at(b, x + k * dx, y + k * dy);
      s += v === who ? '1' : v === 0 ? '0' : '2';
    }
    let best = 0;
    for (const [p, sc] of PATS) {
      if (sc <= best) continue;
      let i = s.indexOf(p);
      while (i !== -1) {
        if (i <= 5 && i + p.length > 5) { best = sc; break; }
        i = s.indexOf(p, i + 1);
      }
    }
    return best;
  }
  function cellScore(b, x, y, who) {
    let total = 0, threes = 0, fours = 0;
    for (const [dx, dy] of DIRS) {
      const s = dirScore(b, x, y, dx, dy, who);
      total += s;
      if (s >= 1e4 && s < 1e5) fours++;
      if (s >= 3e3 && s < 1e4) threes++;
    }
    // 双活三、四三、双四 等组合杀
    if (fours >= 2 || (fours >= 1 && threes >= 1)) total += 5e4;
    else if (threes >= 2) total += 2e4;
    return total;
  }
  function winLine(b, x, y) {
    const who = b[y * N + x]; if (!who) return null;
    for (const [dx, dy] of DIRS) {
      const line = [[x, y]];
      for (let k = 1; at(b, x + k * dx, y + k * dy) === who; k++) line.push([x + k * dx, y + k * dy]);
      for (let k = 1; at(b, x - k * dx, y - k * dy) === who; k++) line.unshift([x - k * dx, y - k * dy]);
      if (line.length >= 5) return line;
    }
    return null;
  }
  function candidates(b) {
    const out = [], seen = new Uint8Array(N * N);
    let any = false;
    for (let i = 0; i < N * N; i++) {
      if (!b[i]) continue; any = true;
      const x = i % N, y = (i / N) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const j = ny * N + nx;
        if (!b[j] && !seen[j]) { seen[j] = 1; out.push(j); }
      }
    }
    if (!any) out.push(7 * N + 7);
    return out;
  }
  function rank(b, who, defW) {
    const foe = who === 1 ? 2 : 1;
    return candidates(b).map(i => {
      const x = i % N, y = (i / N) | 0;
      const att = cellScore(b, x, y, who), def = cellScore(b, x, y, foe);
      return { i, att, def, v: att >= 1e7 ? 1e9 : att * 1.1 + def * defW };
    }).sort((a, b2) => b2.v - a.v);
  }
  const LEVELS = { easy: { defW: 0.5, top: 4 }, normal: { defW: 1, top: 1 }, hard: { defW: 1, top: 1, look: 10 } };
  function bestMove(b, who, level) {
    const L = LEVELS[level] || LEVELS.normal, foe = who === 1 ? 2 : 1;
    const list = rank(b, who, L.defW);
    if (!list.length) return -1;
    if (list[0].att >= 1e7) return list[0].i;          // 能赢直接赢
    if (L.top > 1) return list[Math.floor(Math.random() * Math.min(L.top, list.length))].i;
    if (!L.look) return list[0].i;
    // 两层推演：我下后，对方最好应手的威胁越小越好
    let best = list[0].i, bestV = -Infinity;
    for (const c of list.slice(0, L.look)) {
      b[c.i] = who;
      const reply = rank(b, foe, 1)[0];
      b[c.i] = 0;
      const v = c.v - (reply ? reply.att * 0.9 : 0);
      if (v > bestV) { bestV = v; best = c.i; }
    }
    return best;
  }
  root.GomokuEngine = { N, bestMove, winLine, cellScore };
})(typeof self !== 'undefined' ? self : globalThis);
