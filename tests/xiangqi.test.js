// 中国象棋 perft 校验（初始局面公认结果 44 / 1920 / 79666 / 3290240）
require('../games/xiangqi/engine.js');
const { Pos, perft, bestMove } = globalThis.XiangqiEngine;
let fail = 0;
[44, 1920, 79666, 3290240].forEach((n, i) => {
  const got = perft(new Pos(), i + 1);
  if (got !== n) { fail++; console.log('FAIL start d' + (i + 1), got, '!=', n); }
});
// 双车错杀：红车从 (2,0) 进底线将死
const p = new Pos('4k4/R8/R8/9/9/9/9/9/9/3K5 w');
const m = bestMove(p, 'normal');
// 将死或困毙都是一步胜（象棋困毙判负）
p.make(m);
const res = p.result(1);
if (!res || res.winner !== 'w') { fail++; console.log('FAIL not a win after AI move', m, res); }
console.log(fail ? `xiangqi: ${fail} failures` : 'xiangqi: perft d1-d4 + mate-in-1 ok');
process.exitCode = fail ? 1 : 0;
