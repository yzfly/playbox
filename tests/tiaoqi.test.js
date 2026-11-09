require('../games/tiaoqi/engine.js');
const T = globalThis.TiaoqiEngine;
let fail = 0; const bad = (...a) => { fail++; console.log('FAIL', ...a); };
if (T.cells.length !== 121) bad('cells', T.cells.length);
if (T.ARMS.some(a => a.length !== 10)) bad('arm sizes', T.ARMS.map(a => a.length));
if (new Set(T.ARMS.flat()).size !== 60) bad('arms overlap');
for (let k = 0; k < 6; k++) { const a = T.cells[T.TIPS[k]], b = T.cells[T.TIPS[(k + 3) % 6]]; if (a.x !== -b.x || a.y !== -b.y) bad('opposite tips', k); }
if (T.cells[T.TIPS[0]].py <= 0) bad('arm 0 should be at bottom');
// 开局：最前排每子能走，跳跃可达
const g0 = T.newGame([{ arm: 0, kind: 'ai' }, { arm: 3, kind: 'ai' }]);
const ms = T.allMoves(g0, 0);
if (ms.length === 0) bad('no opening moves');
if (!ms.some(m => T.dist(m.path[0], m.path[1]) === 2)) bad('no opening jump');
// 自我对弈
for (const n of [2, 3, 6]) {
  let done = 0, total = 0;
  for (let k = 0; k < 6; k++) {
    const g = T.newGame(T.LAYOUTS[n].map(arm => ({ arm, kind: 'ai' })));
    while (g.winner < 0 && g.moves < 3000) { const m = T.aiMove(g, g.turn); if (!m) { g.turn = (g.turn + 1) % n; g.moves++; continue; } T.apply(g, m); }
    if (g.winner >= 0) done++; total += g.moves;
  }
  console.log(`${n}p: finished ${done}/6 avg moves ${Math.round(total / 6)}`);
  if (done < 5) bad(`${n}p games stall`);
}
console.log(fail ? `tiaoqi: ${fail} failures` : 'tiaoqi: ok');
process.exitCode = fail ? 1 : 0;
