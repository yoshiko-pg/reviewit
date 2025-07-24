#!/usr/bin/env node
import { spawn } from 'child_process';

const commitish = process.argv[2] || 'HEAD';
const compareWith = process.argv[3];
const CLI_SERVER_READY_MESSAGE = 'difit server started';

console.log('🚀 Starting CLI server...');

// Start CLI server
const cliArgs = ['run', 'dev:cli', commitish];
if (compareWith) {
  cliArgs.push(compareWith);
}
cliArgs.push('--no-open');

const cliProcess = spawn('pnpm', cliArgs, {
  // Pipe stdout to capture CLI server ready
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
});

// Wait for CLI server to be ready, then start Vite
let cliReady = false;
let viteProcess = null;

cliProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
  const output = data.toString();

  // Wait for CLI server before starting Vite to prevent proxy connection errors
  // Uses stdout parsing to keep dev orchestration separate from main CLI logic
  if (!cliReady && output.includes(CLI_SERVER_READY_MESSAGE)) {
    cliReady = true;
    console.log('🎨 Starting Vite dev server...');
    viteProcess = spawn('pnpm', ['exec', 'vite', '--open'], {
      stdio: 'inherit',
      shell: true,
    });
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  cliProcess.kill('SIGINT');
  viteProcess?.kill('SIGINT');
  process.exit(0);
});

cliProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`CLI server exited with code ${code}`);
  }
  // Kill vite process when CLI exits
  viteProcess?.kill('SIGINT');
  process.exit(code || 0);
});
