#!/usr/bin/env node
import { spawn } from 'child_process';

const commitish = process.argv[2] || 'HEAD';

console.log('🚀 Starting CLI server...');

// Start CLI server
const cliProcess = spawn('pnpm', ['run', 'dev:cli', commitish, '--no-open'], {
  stdio: 'inherit',
  shell: true,
});

// Start Vite after 1 second
setTimeout(() => {
  console.log('🎨 Starting Vite dev server...');
  spawn('vite', ['--open'], {
    stdio: 'inherit',
    shell: true,
  });
}, 1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  cliProcess.kill('SIGINT');
  process.exit(0);
});

cliProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`CLI server exited with code ${code}`);
    process.exit(code);
  }
});
