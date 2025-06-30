#!/usr/bin/env node

import { Command } from 'commander';
import React from 'react';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { validateCommitish } from './utils.js';

const program = new Command();

program
  .name('reviewit')
  .description('A lightweight Git diff viewer with GitHub-like interface')
  .version(pkg.version)
  .argument(
    '[commit-ish]',
    'Git commit, tag, branch, HEAD~n reference, or "working"/"staged" (default: working)',
    'working'
  )
  .option('--port <port>', 'preferred port (auto-assigned if occupied)', parseInt)
  .option('--no-open', 'do not automatically open browser')
  .option('--mode <mode>', 'diff mode (inline only for now)', 'inline')
  .option('--tui', 'use terminal UI instead of web interface')
  .option('--staged', 'show staged changes only (TUI mode)')
  .option('--dirty', 'show unstaged changes only (TUI mode, default)')
  .action(async (commitish: string, options) => {
    try {
      if (options.tui) {
        // Dynamic import for TUI mode
        const { render } = await import('ink');
        const { default: TuiApp } = await import('../tui/App.js');

        // Determine what to show
        let targetCommitish = commitish;
        if (options.staged) {
          targetCommitish = 'staged';
        } else if (options.dirty || commitish === 'working') {
          targetCommitish = 'working';
        }

        render(React.createElement(TuiApp, { commitish: targetCommitish }));
        return;
      }
      if (!validateCommitish(commitish)) {
        console.error('Error: Invalid commit-ish format');
        process.exit(1);
      }

      const { url } = await startServer({
        commitish,
        preferredPort: options.port,
        openBrowser: options.open,
        mode: options.mode,
      });

      console.log(`\n🚀 ReviewIt server started on ${url}`);
      console.log(`📋 Reviewing: ${commitish}`);

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
