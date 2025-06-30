#!/usr/bin/env node

import { Command } from 'commander';
import React from 'react';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { validateCommitish } from './utils.js';

interface CliOptions {
  port?: number;
  open: boolean;
  mode: string;
  tui?: boolean;
  staged?: boolean;
  dirty?: boolean;
}

const program = new Command();

program
  .name('reviewit')
  .description('A lightweight Git diff viewer with GitHub-like interface')
  .version(pkg.version)
  .argument(
    '[commit-ish]',
    'Git commit, tag, branch, HEAD~n reference, or "working"/"staged"/"." (default: HEAD)',
    'HEAD'
  )
  .option('--port <port>', 'preferred port (auto-assigned if occupied)', parseInt)
  .option('--no-open', 'do not automatically open browser')
  .option('--mode <mode>', 'diff mode (inline only for now)', 'inline')
  .option('--tui', 'use terminal UI instead of web interface')
  .action(async (commitish: string, options: CliOptions) => {
    try {
      // Determine what to show
      let targetCommitish = commitish;

      // Handle special arguments
      if (commitish === 'working') {
        targetCommitish = 'working';
      } else if (commitish === 'staged') {
        targetCommitish = 'staged';
      } else if (commitish === '.') {
        targetCommitish = '.';
      }

      if (options.tui) {
        // Check if we're in a TTY environment
        if (!process.stdin.isTTY) {
          console.error('Error: TUI mode requires an interactive terminal (TTY).');
          console.error('Try running the command directly in your terminal without piping.');
          process.exit(1);
        }

        // Dynamic import for TUI mode
        const { render } = await import('ink');
        const { default: TuiApp } = await import('../tui/App.js');

        render(React.createElement(TuiApp, { commitish: targetCommitish }));
        return;
      }

      if (!validateCommitish(targetCommitish)) {
        console.error('Error: Invalid commit-ish format');
        process.exit(1);
      }

      const { url } = await startServer({
        commitish: targetCommitish,
        preferredPort: options.port,
        openBrowser: options.open,
        mode: options.mode,
      });

      console.log(`\n🚀 ReviewIt server started on ${url}`);
      console.log(`📋 Reviewing: ${targetCommitish}`);

      if (options.open) {
        console.log('🌐 Opening browser...\n');
      } else {
        console.log('💡 Use --open to automatically open browser\n');
      }

      process.on('SIGINT', () => {
        console.log('\n👋 Shutting down ReviewIt server...');
        process.exit(0);
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
