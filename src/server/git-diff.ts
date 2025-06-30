import { simpleGit, type SimpleGit } from 'simple-git';

import { validateDiffArguments, shortHash } from '../cli/utils.js';
import { type DiffFile, type DiffChunk, type DiffLine, type DiffResponse } from '../types/diff.js';

export class GitDiffParser {
  private git: SimpleGit;

  constructor(repoPath = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  async parseDiff(
    targetCommitish: string,
    baseCommitish: string,
    ignoreWhitespace = false
  ): Promise<DiffResponse> {
    try {
      // Validate arguments
      const validation = validateDiffArguments(targetCommitish, baseCommitish);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      let resolvedCommit: string;
      let diffArgs: string[];

      // Handle target special chars (base is always a regular commit)
      if (targetCommitish === 'working') {
        // Show unstaged changes (working vs staged)
        resolvedCommit = 'Working Directory (unstaged changes)';
        diffArgs = [];
      } else if (targetCommitish === 'staged') {
        // Show staged changes against base commit
        const baseHash = await this.git.revparse([baseCommitish]);
        resolvedCommit = `${shortHash(baseHash)} vs Staging Area (staged changes)`;
        diffArgs = ['--cached', baseCommitish];
      } else if (targetCommitish === '.') {
        // Show all uncommitted changes against base commit
        const baseHash = await this.git.revparse([baseCommitish]);
        resolvedCommit = `${shortHash(baseHash)} vs Working Directory (all uncommitted changes)`;
        diffArgs = [baseCommitish];
      } else {
        // Both are regular commits: standard commit-to-commit comparison
        const targetHash = await this.git.revparse([targetCommitish]);
        const baseHash = await this.git.revparse([baseCommitish]);
        resolvedCommit = `${shortHash(baseHash)}..${shortHash(targetHash)}`;
        diffArgs = [baseCommitish, targetCommitish];
      }

      if (ignoreWhitespace) {
        diffArgs.push('-w');
      }

      // Add --color=never to ensure plain text output without ANSI escape sequences
      const diffSummary = await this.git.diffSummary(diffArgs);
      const diffRaw = await this.git.diff(['--color=never', ...diffArgs]);

      const files = this.parseUnifiedDiff(diffRaw, diffSummary.files);

      return {
        commit: resolvedCommit,
        files,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse diff for ${targetCommitish} vs ${baseCommitish}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private parseUnifiedDiff(diffText: string, summary: any[]): DiffFile[] {
    const files: DiffFile[] = [];
    const fileBlocks = diffText.split(/^diff --git /m).slice(1);

    for (let i = 0; i < fileBlocks.length; i++) {
      const block = `diff --git ${fileBlocks[i]}`;
      const summaryItem = summary[i];

      if (!summaryItem) continue;

      const file = this.parseFileBlock(block, summaryItem);
      if (file) {
        files.push(file);
      }
    }

    return files;
  }

  private parseFileBlock(block: string, summary: any): DiffFile | null {
    const lines = block.split('\n');
    const headerLine = lines[0];

    const pathMatch = headerLine.match(/^diff --git [a-z]\/(.+) [a-z]\/(.+)$/);
    if (!pathMatch) return null;

    const oldPath = pathMatch[1];
    const newPath = pathMatch[2];
    const path = newPath;

    let status: DiffFile['status'] = 'modified';
    if (summary.binary) return null;

    if (oldPath !== newPath) {
      status = 'renamed';
    } else if (summary.insertions && !summary.deletions) {
      status = 'added';
    } else if (summary.deletions && !summary.insertions) {
      status = 'deleted';
    }

    const chunks = this.parseChunks(lines);

    return {
      path,
      oldPath: oldPath !== newPath ? oldPath : undefined,
      status,
      additions: summary.insertions || 0,
      deletions: summary.deletions || 0,
      chunks,
    };
  }

  private parseChunks(lines: string[]): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    let currentChunk: DiffChunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
        if (match) {
          const oldStart = parseInt(match[1]);
          const oldLines = parseInt(match[2] || '1');
          const newStart = parseInt(match[3]);
          const newLines = parseInt(match[4] || '1');

          oldLineNum = oldStart;
          newLineNum = newStart;

          currentChunk = {
            header: line,
            oldStart,
            oldLines,
            newStart,
            newLines,
            lines: [],
          };
        }
      } else if (
        currentChunk &&
        (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))
      ) {
        const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'delete' : 'normal';

        const diffLine: DiffLine = {
          type,
          content: line.slice(1),
          oldLineNumber: type !== 'add' ? oldLineNum : undefined,
          newLineNumber: type !== 'delete' ? newLineNum : undefined,
        };

        currentChunk.lines.push(diffLine);

        if (type !== 'add') oldLineNum++;
        if (type !== 'delete') newLineNum++;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  async validateCommit(commitish: string): Promise<boolean> {
    try {
      if (commitish === '.' || commitish === 'working' || commitish === 'staged') {
        // For working directory or staging area, just check if we're in a git repo
        await this.git.status();
        return true;
      }
      await this.git.show([commitish, '--name-only']);
      return true;
    } catch {
      return false;
    }
  }
}
