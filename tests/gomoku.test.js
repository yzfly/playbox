require('../games/gomoku/engine.js');
const { N, bestMove, winLine } = globalThis.GomokuEngine;
let fail = 0;
const board = () => new Array(N * N).fill(0);
const put = (b, who, pts) => pts.forEach(([x, y]) => (b[y * N + x] = who));
for (const level of ['easy', 'normal', 'hard']) {
  // 1) 自己四连必须成五
  let b = board(); put(b, 2, [[3, 3], [4, 3], [5, 3], [6, 3]]); put(b, 1, [[3, 4], [4, 4], [5, 4], [9, 9]]);
  let m = bestMove(b, 2, level); if (!(m === 3 * N + 7 || m === 3 * N + 2)) { fail++; console.log('FAIL win', level, m % N, (m / N) | 0); }
  // 2) 对方冲四必须堵
  b = board(); put(b, 1, [[5, 5], [6, 6], [7, 7], [8, 8]]); put(b, 2, [[4, 4], [0, 14]]);
  m = bestMove(b, 2, level); if (level !== 'easy' && m !== 9 * N + 9) { fail++; console.log('FAIL block', level, m % N, (m / N) | 0); }
}
// 3) 自我对弈能正常结束
for (let g = 0; g < 3; g++) {
  const b = board(); let who = 1, winner = 0, moves = 0;
  while (moves < N * N) {
    const m = bestMove(b, who, g === 0 ? 'hard' : 'normal'); if (m < 0 || b[m]) { fail++; console.log('FAIL bad move'); break; }
    b[m] = who; moves++;
    if (winLine(b, m % N, (m / N) | 0)) { winner = who; break; }
    who = 3 - who;
  }
  console.log(`self-play ${g}: winner=${winner} moves=${moves}`);
}
console.log(fail ? `gomoku: ${fail} failures` : 'gomoku: ok');
process.exitCode = fail ? 1 : 0;
