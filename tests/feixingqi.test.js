require('../games/feixingqi/engine.js');
const F = globalThis.FeixingqiEngine;
let fail = 0; const bad = (...a) => { fail++; console.log('FAIL', ...a); };
// 棋盘几何
if (F.TRACK.length !== 52) bad('track length', F.TRACK.length);
if (new Set(F.TRACK.map(String)).size !== 52) bad('track has duplicates');
for (let i = 0; i < 52; i++) { const [a, b] = F.TRACK[i], [c, d] = F.TRACK[(i + 1) % 52]; const dx = Math.abs(a - c), dy = Math.abs(b - d); if (!(dx + dy === 1 || (dx === 1 && dy === 1 && i % 13 === 4))) bad('track not contiguous at', i); }
for (let p = 0; p < 4; p++) {
  if (F.trackColor(F.abs(p, 0)) !== p) bad('start square color', p);
  for (let q = 51; q <= 55; q++) { const c = F.cellOf(p, q); if (F.TRACK.some(t => t[0] === c[0] && t[1] === c[1])) bad('home lane overlaps track', p, q); }
  const e = F.cellOf(p, 55); if (Math.abs(e[0] - 7) + Math.abs(e[1] - 7) !== 2) bad('home lane end not next to center', p, e);
}
// 起飞只能 6
let g = F.newGame(['ai', 'ai', 'ai', 'ai']);
if (F.movable(g, 0, 5).length !== 0 || F.movable(g, 0, 6).length !== 4) bad('takeoff rule');
// 反弹：在 54 掷 5 → 56 后退到 53
g.pieces[0][0] = 54; if (F.plan(g, 0, 0, 5).to !== 53) bad('bounce', F.plan(g, 0, 0, 5).to);
// 同色格跳跃：从 2 掷 2 → 4 → 跳到 8
g.pieces[0][0] = 2; if (F.plan(g, 0, 0, 2).to !== 8) bad('jump', F.plan(g, 0, 0, 2).to);
// 飞行：落 16 → 28；从 10 掷 2 → 12 → 跳 16 → 飞 28
g.pieces[0][0] = 13; if (F.plan(g, 0, 0, 3).to !== 28) bad('fly', F.plan(g, 0, 0, 3).to);
g.pieces[0][0] = 10; if (F.plan(g, 0, 0, 2).to !== 28) bad('jump+fly', F.plan(g, 0, 0, 2).to);
// 撞子：黄方棋子在红方第 5 格
g = F.newGame(['ai', 'ai', 'ai', 'ai']); g.pieces[0][0] = 2; g.pieces[1][0] = (F.abs(0, 5) - 13 + 52) % 52;
const r = F.apply(g, 0, 0, 3); if (!(r.bumps.length === 1 && g.pieces[1][0] === -1)) bad('bump', r);
// 大量 AI 自我对弈都能结束
let turns = 0, wins = [0, 0, 0, 0];
for (let n = 0; n < 300; n++) {
  const seats = n % 3 === 0 ? ['ai', null, 'ai', null] : ['ai', 'ai', 'ai', 'ai'];
  g = F.newGame(seats); let t = 0;
  while (g.winner < 0 && t < 5000) {
    const dice = 1 + Math.floor(Math.random() * 6), p = g.turn, i = F.aiChoose(g, p, dice);
    if (i >= 0) F.apply(g, p, i, dice);
    for (const arr of g.pieces) for (const x of arr) if (x < -1 || x > F.FINISH) bad('prog out of range', x);
    F.nextTurn(g, dice); t++;
  }
  if (g.winner < 0) bad('game did not finish'); else wins[g.winner]++;
  turns += t;
}
console.log('avg turns', Math.round(turns / 300), 'wins', wins);
console.log(fail ? `feixingqi: ${fail} failures` : 'feixingqi: ok');
process.exitCode = fail ? 1 : 0;
