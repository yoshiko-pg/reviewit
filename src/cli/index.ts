#!/usr/bin/env node

import { Command } from 'commander';
import React from 'react';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { parsePRUrl, validatePRRemote, preparePRForDiff } from './pr-utils.js';
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
      let baseBranch: string | undefined;

      // Handle special arguments
      if (commitish === 'working') {
        targetCommitish = 'working';
      } else if (commitish === 'staged') {
        targetCommitish = 'staged';
      } else if (commitish === '.') {
        targetCommitish = '.';
      }

      // Check if this is a PR URL
      const prInfo = parsePRUrl(targetCommitish);
      if (prInfo) {
        console.log(`📋 Checking PR #${prInfo.number} from ${prInfo.owner}/${prInfo.repo}...`);

        const validation = await validatePRRemote(prInfo);
        if (!validation.isValid) {
          console.error('\nError:', validation.error);
          process.exit(1);
        }

        console.log(`✓ Found remote '${validation.remoteName}' for this repository`);
        console.log('🔄 Fetching PR data...');

        try {
          const result = await preparePRForDiff(prInfo, validation.remoteName!);
          targetCommitish = result.headBranch;
          baseBranch = result.baseBranch;
          console.log(`✓ PR branch fetched successfully`);
          console.log(`  Head: ${result.headBranch}`);
          console.log(`  Base: ${result.baseBranch}`);
        } catch (error) {
          console.error('\nError:', error instanceof Error ? error.message : 'Unknown error');
          process.exit(1);
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

        render(React.createElement(TuiApp, { commitish: targetCommitish, baseBranch }));
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
        baseBranch,
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
