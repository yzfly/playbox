// 国际象棋 perft 校验（标准测试局面与公认结果）
require('../games/chess/engine.js');
const { Pos, perft, bestMove } = globalThis.ChessEngine;
const cases = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
let fail = 0;
for (const [fen, exp] of cases) exp.forEach((n, i) => {
  const p = new Pos(fen), got = perft(p, i + 1);
  if (got !== n) { fail++; console.log('FAIL', fen, 'd' + (i + 1), got, '!=', n); }
});
// AI 一步杀：白方 Qh5xf7#（学者杀）
const p = new Pos('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
const m = bestMove(p, 'normal');
if (!(m && ChessEngine.sqName(m.to) === 'f7')) { fail++; console.log('FAIL mate-in-1', m && ChessEngine.sqName(m.to)); }
console.log(fail ? `chess: ${fail} failures` : 'chess: all perft + mate-in-1 ok');
process.exitCode = fail ? 1 : 0;
