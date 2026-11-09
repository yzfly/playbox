// 运行全部引擎测试：node tests/run-all.js
const { execFileSync } = require('child_process');
const path = require('path');
const files = ['chess.test.js', 'xiangqi.test.js', 'gomoku.test.js', 'feixingqi.test.js', 'tiaoqi.test.js'];
let failed = 0;
for (const f of files) {
  try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' })); }
  catch (e) { failed++; process.stdout.write(e.stdout || ''); console.log(`✗ ${f}`); }
}
try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, 'skybolt.sim.js'), path.join(__dirname, '../games/skybolt/index.html'), 'god'], { encoding: 'utf8' })); }
catch (e) { failed++; console.log('✗ skybolt.sim.js', e.message); }
console.log(failed ? `${failed} 个测试失败` : '全部测试通过');
process.exitCode = failed ? 1 : 0;
