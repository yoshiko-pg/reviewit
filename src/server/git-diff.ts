import { simpleGit, type SimpleGit } from 'simple-git';

import { validateDiffArguments, shortHash, createCommitRangeString } from '../cli/utils.js';
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
        resolvedCommit = createCommitRangeString(shortHash(baseHash), shortHash(targetHash));
        diffArgs = [resolvedCommit];
      }

      if (ignoreWhitespace) {
        diffArgs.push('-w');
      }

      // Ignore external diff-tools to unify output.
      // https://github.com/yoshiko-pg/reviewit/issues/19
      diffArgs.push('--no-ext-diff', '--color=never');

      // Add --color=never to ensure plain text output without ANSI escape sequences
      const diffSummary = await this.git.diffSummary(diffArgs);
      const diffRaw = await this.git.diff(['--color=never', ...diffArgs]);

      const files = this.parseUnifiedDiff(diffRaw, diffSummary.files);

      return {
        commit: resolvedCommit,
        files,
        isEmpty: files.length === 0,
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

    const pathMatch = headerLine.match(/^diff --git (?:[a-z]\/)?(.+) (?:[a-z]\/)?(.+)$/);
    if (!pathMatch) return null;

    const oldPath = pathMatch[1];
    const newPath = pathMatch[2];
    const path = newPath;

    let status: DiffFile['status'] = 'modified';

    // Check for new file mode (added files)
    const newFileMode = lines.find((line) => line.startsWith('new file mode'));
    const deletedFileMode = lines.find((line) => line.startsWith('deleted file mode'));

    // Check for /dev/null which indicates added or deleted files
    const minusLine = lines.find((line) => line.startsWith('--- '));
    const plusLine = lines.find((line) => line.startsWith('+++ '));

    if (newFileMode || (minusLine && minusLine.includes('/dev/null'))) {
      status = 'added';
    } else if (deletedFileMode || (plusLine && plusLine.includes('/dev/null'))) {
      status = 'deleted';
    } else if (oldPath !== newPath) {
      status = 'renamed';
    } else if (summary.insertions && !summary.deletions) {
      status = 'added';
    } else if (summary.deletions && !summary.insertions) {
      status = 'deleted';
    }

    // For binary files, don't try to parse chunks
    const chunks = summary.binary ? [] : this.parseChunks(lines);

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

  async getBlobContent(filepath: string, ref: string): Promise<Buffer> {
    try {
      // For working directory, read directly from filesystem
      if (ref === 'working') {
        const fs = await import('fs');
        return fs.readFileSync(filepath);
      }

      // For git refs, we need to use child_process to execute git cat-file
      // to properly handle binary data
      const { execSync } = await import('child_process');

      // First, get the blob hash for the file at the given ref
      const blobHash = execSync(`git rev-parse "${ref}:${filepath}"`, { encoding: 'utf8' }).trim();

      // Then use git cat-file to get the raw binary content
      // Increase maxBuffer to handle large files (default is 1024*1024 = 1MB)
      const buffer = execSync(`git cat-file blob ${blobHash}`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB limit
      });

      return buffer;
    } catch (error) {
      // Check if it's a buffer size error
      if (
        error instanceof Error &&
        (error.message.includes('ENOBUFS') || error.message.includes('maxBuffer'))
      ) {
        throw new Error(`Image file ${filepath} is too large to display (over 10MB limit)`);
      }

      throw new Error(
        `Failed to get blob content for ${filepath} at ${ref}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
