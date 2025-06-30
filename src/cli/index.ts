#!/usr/bin/env node

import { Command } from 'commander';
import React from 'react';
import { simpleGit, type SimpleGit } from 'simple-git';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import {
  findUntrackedFiles,
  markFilesIntentToAdd,
  promptUser,
  validateCommitish,
} from './utils.js';

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

      const git = simpleGit();
      await handleUntrackedFiles(git, commitish);

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

// Check for untracked files and prompt user to add them for diff visibility
// Only applies when viewing working directory changes (commitish = '.')
async function handleUntrackedFiles(git: SimpleGit, commitish: string): Promise<void> {
  if (commitish !== '.') {
    return;
  }

  const files = await findUntrackedFiles(git);
  if (files.length === 0) {
    return;
  }

  const userConsent = await promptUserToIncludeUntracked(files);
  if (userConsent) {
    await markFilesIntentToAdd(git, files);
    console.log('✅ Files added with --intent-to-add');
    console.log(`   💡 To undo this, run \`git restore --staged ${files.join(' ')}\``);
  } else {
    console.log('ℹ️ Untracked files will not be shown in diff');
  }
}

async function promptUserToIncludeUntracked(files: string[]): Promise<boolean> {
  console.log(`\n📝 Found ${files.length} untracked file(s):`);
  for (const file of files) {
    console.log(`    - ${file}`);
  }

  return await promptUser(
    '\n❓ Would you like to include these untracked files in the diff review? (y/N): '
  );
}
