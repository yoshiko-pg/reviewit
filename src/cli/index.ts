#!/usr/bin/env node
import * as readline from 'readline';

import { Command } from 'commander';
import { simpleGit } from 'simple-git';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { validateCommitish } from './utils.js';

async function checkUntrackedFiles(): Promise<void> {
  const git = simpleGit();

  try {
    const status = await git.status();
    const untrackedFiles = status.not_added;

    if (untrackedFiles.length === 0) {
      return;
    }

    console.log(`\n📝 Found ${untrackedFiles.length} untracked file(s):`);
    untrackedFiles.forEach((file) => console.log(`   ${file}`));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        '\n❓ Add these files to index with --intent-to-add to include them in diff? (y/N): ',
        resolve
      );
    });

    rl.close();

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await git.add(['--intent-to-add', ...untrackedFiles]);
      console.log('✅ Files added with --intent-to-add');
    } else {
      console.log('ℹ️  Untracked files will not be shown in diff');
    }
  } catch (error) {
    console.warn(
      '⚠️  Could not check for untracked files:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

const program = new Command();

program
  .name('reviewit')
  .description('A lightweight Git diff viewer with GitHub-like interface')
  .version(pkg.version)
  .argument('[commit-ish]', 'Git commit, tag, branch, or HEAD~n reference (default: HEAD)', 'HEAD')
  .option('--port <port>', 'preferred port (auto-assigned if occupied)', parseInt)
  .option('--no-open', 'do not automatically open browser')
  .option('--mode <mode>', 'diff mode (inline only for now)', 'inline')
  .action(async (commitish: string, options) => {
    try {
      if (!validateCommitish(commitish)) {
        console.error('Error: Invalid commit-ish format');
        process.exit(1);
      }

      // Check for untracked files and optionally add them with --intent-to-add
      await checkUntrackedFiles();

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
