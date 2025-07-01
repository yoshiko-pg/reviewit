#!/usr/bin/env node

import { Command } from 'commander';
import React from 'react';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { validateDiffArguments } from './utils.js';

type SpecialArg = 'working' | 'staged' | '.';

function isSpecialArg(arg: string): arg is SpecialArg {
  return arg === 'working' || arg === 'staged' || arg === '.';
}

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
  .argument(
    '[compare-with]',
    'Optional: Compare with this commit/branch (shows diff between commit-ish and compare-with)'
  )
  .option('--port <port>', 'preferred port (auto-assigned if occupied)', parseInt)
  .option('--no-open', 'do not automatically open browser')
  .option('--mode <mode>', 'diff mode (inline only for now)', 'inline')
  .option('--tui', 'use terminal UI instead of web interface')
  .action(async (commitish: string, compareWith: string | undefined, options: CliOptions) => {
    try {
      // Determine target and base commitish
      let targetCommitish = commitish;
      let baseCommitish: string;

      if (compareWith) {
        // If compareWith is provided, use it as base
        baseCommitish = compareWith;
      } else {
        // Handle special arguments
        if (isSpecialArg(commitish)) {
          baseCommitish = 'HEAD';
        } else {
          baseCommitish = commitish + '^';
        }
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

        render(React.createElement(TuiApp, { targetCommitish, baseCommitish }));
        return;
      }

      const validation = validateDiffArguments(targetCommitish, compareWith);
      if (!validation.valid) {
        console.error(`Error: ${validation.error}`);
        process.exit(1);
      }

      const { url, port } = await startServer({
        targetCommitish,
        baseCommitish,
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

      process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down ReviewIt server...');

        // Try to fetch comments before shutting down
        try {
          const response = await fetch(`http://localhost:${port}/api/comments-output`);
          if (response.ok) {
            const data = await response.text();
            if (data.trim()) {
              console.log(data);
            }
          }
        } catch {
          // Silently ignore fetch errors during shutdown
        }

        process.exit(0);
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
