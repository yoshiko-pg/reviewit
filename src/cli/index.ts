#!/usr/bin/env node

import { Command } from 'commander';
import React from 'react';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { validateDiffArguments, resolvePrCommits } from './utils.js';

type SpecialArg = 'working' | 'staged' | '.';

function isSpecialArg(arg: string): arg is SpecialArg {
  return arg === 'working' || arg === 'staged' || arg === '.';
}

interface CliOptions {
  port?: number;
  host?: string;
  open: boolean;
  mode: string;
  tui?: boolean;
  pr?: string;
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
  .option('--host <host>', 'host address to bind to (default: 127.0.0.1)', '127.0.0.1')
  .option('--no-open', 'do not automatically open browser')
  .option('--mode <mode>', 'diff mode (inline only for now)', 'inline')
  .option('--tui', 'use terminal UI instead of web interface')
  .option('--pr <url>', 'GitHub PR URL to review (e.g., https://github.com/owner/repo/pull/123)')
  .action(async (commitish: string, compareWith: string | undefined, options: CliOptions) => {
    try {
      // Determine target and base commitish
      let targetCommitish = commitish;
      let baseCommitish: string;

      // Handle PR URL option
      if (options.pr) {
        if (commitish !== 'HEAD' || compareWith) {
          console.error('Error: --pr option cannot be used with positional arguments');
          process.exit(1);
        }

        try {
          const prCommits = await resolvePrCommits(options.pr);
          targetCommitish = prCommits.targetCommitish;
          baseCommitish = prCommits.baseCommitish;

          console.log(`📋 Reviewing PR: ${options.pr}`);
          console.log(`🎯 Target commit: ${targetCommitish.substring(0, 7)}`);
          console.log(`📍 Base commit: ${baseCommitish.substring(0, 7)}`);
        } catch (error) {
          console.error(
            `Error resolving PR: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          process.exit(1);
        }
      } else if (compareWith) {
        // If compareWith is provided, use it as base
        baseCommitish = compareWith;
      } else {
        // Handle special arguments
        if (commitish === 'working') {
          // working compares working directory with staging area
          baseCommitish = 'staged';
        } else if (isSpecialArg(commitish)) {
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

      // Skip validation for PR URLs as they're already resolved to valid commits
      if (!options.pr) {
        const validation = validateDiffArguments(targetCommitish, compareWith);
        if (!validation.valid) {
          console.error(`Error: ${validation.error}`);
          process.exit(1);
        }
      }

      const { url, port, isEmpty } = await startServer({
        targetCommitish,
        baseCommitish,
        preferredPort: options.port,
        host: options.host,
        openBrowser: options.open,
        mode: options.mode,
      });

      console.log(`\n🚀 ReviewIt server started on ${url}`);
      console.log(`📋 Reviewing: ${targetCommitish}`);

      if (isEmpty) {
        console.log(
          '\n⚠️ \x1b[33mNo differences found. Browser will not open automatically.\x1b[0m'
        );
        console.log(`   Server is running at ${url} if you want to check manually.\n`);
      } else if (options.open) {
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
