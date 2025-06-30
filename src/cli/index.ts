#!/usr/bin/env node

import { Command } from 'commander';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import { validateCommitish } from './utils.js';

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
