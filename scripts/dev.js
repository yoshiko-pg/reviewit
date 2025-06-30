#!/usr/bin/env node
import { spawn } from 'child_process';

const commitish = process.argv[2] || 'HEAD';
const CLI_SERVER_READY_MESSAGE = 'ReviewIt server started';

console.log('🚀 Starting CLI server...');

// Start CLI server
const cliProcess = spawn('pnpm', ['run', 'dev:cli', commitish, '--no-open'], {
  // Pipe stdout to detect server readiness
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
    viteProcess = spawn('vite', ['--open'], {
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
    process.exit(code);
  }
});
