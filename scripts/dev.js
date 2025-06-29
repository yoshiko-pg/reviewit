#!/usr/bin/env node
import { spawn } from 'child_process';

const commitish = process.argv[2] || 'HEAD';

const concurrentlyArgs = [`pnpm run dev:cli ${commitish} --no-open`, 'sleep 1 && vite --open'];

const child = spawn('npx', ['concurrently', ...concurrentlyArgs.map((arg) => `"${arg}"`)], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code);
});
