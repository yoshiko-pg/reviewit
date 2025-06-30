import simpleGit from 'simple-git';

import type { FileDiff } from '../types/diff.js';

export async function loadGitDiff(commitish: string): Promise<FileDiff[]> {
  const git = simpleGit();

  let diff: string;

  if (commitish.toLowerCase() === 'working' || commitish.toLowerCase() === 'unstaged') {
    // Show uncommitted changes
    diff = await git.diff(['--name-status']);
  } else if (commitish.toLowerCase() === 'staged') {
    // Show staged changes
    diff = await git.diff(['--cached', '--name-status']);
  } else {
    // Get list of changed files for a specific commit
    diff = await git.diff([`${commitish}^..${commitish}`, '--name-status']);

    if (!diff.trim()) {
      // Try without parent (for initial commit)
      const diffInitial = await git.diff([commitish, '--name-status']);
      if (!diffInitial.trim()) {
        throw new Error('No changes found in this commit');
      }
      diff = diffInitial;
    }
  }

  const fileChanges = diff
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const [status, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');
      return { status, path };
    });

  // Get diff for each file individually
  const fileDiffs: FileDiff[] = await Promise.all(
    fileChanges.map(async ({ status, path }) => {
      let fileDiff = '';

      if (commitish.toLowerCase() === 'working' || commitish.toLowerCase() === 'unstaged') {
        // Get unstaged changes
        fileDiff = await git.diff(['--', path]);
      } else if (commitish.toLowerCase() === 'staged') {
        // Get staged changes
        fileDiff = await git.diff(['--cached', '--', path]);
      } else {
        try {
          // Get diff for specific file in commit
          fileDiff = await git.diff([`${commitish}^..${commitish}`, '--', path]);
        } catch {
          // For new files or if parent doesn't exist
          fileDiff = await git.diff([commitish, '--', path]);
        }
      }

      const lines = fileDiff.split('\n');
      let additions = 0;
      let deletions = 0;

      lines.forEach((line) => {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      });

      return {
        path,
        status: status as 'A' | 'M' | 'D',
        diff: fileDiff,
        additions,
        deletions,
      };
    })
  );

  return fileDiffs;
}
