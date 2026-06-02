import { spawn } from 'child_process';
import path from 'path';

console.log('---------------------------------------------------------');
console.log('🚀 INITIALIZING REALAGENTS SERVICE INTEGRATION TEST SUITE');
console.log('---------------------------------------------------------');

// Run vitest with the single-run option
const vitestProcess = spawn('npx', ['vitest', 'run'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'test',
  }
});

vitestProcess.on('close', (code) => {
  console.log('---------------------------------------------------------');
  if (code === 0) {
    console.log('✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (EXIT CODE: 0)');
    process.exit(0);
  } else {
    console.error(`❌ INTEGRATION TEST SUITE FAILED WITH EXIT CODE: ${code}`);
    process.exit(code || 1);
  }
});

vitestProcess.on('error', (err) => {
  console.error('❌ Failed to launch Vitest test runner:', err);
  process.exit(1);
});
