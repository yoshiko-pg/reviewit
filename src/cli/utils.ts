import { createInterface } from 'readline/promises';

import type { SimpleGit } from 'simple-git';

export function validateCommitish(commitish: string): boolean {
  if (!commitish || typeof commitish !== 'string') {
    return false;
  }

  const trimmed = commitish.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Special cases
  if (trimmed === 'HEAD~') {
    return false;
  }
  if (trimmed === '.' || trimmed === 'working' || trimmed === 'staged') {
    return true; // Allow special keywords for working directory and staging area diff
  }

  const validPatterns = [
    /^[a-f0-9]{4,40}$/i, // SHA hashes
    /^HEAD(~\d+|\^\d*)*$/, // HEAD, HEAD~1, HEAD^, HEAD^2, etc.
    /^[a-zA-Z][a-zA-Z0-9_\-/.]*$/, // branch names, tags (must start with letter, no ^ or ~ in middle)
  ];

  return validPatterns.some((pattern) => pattern.test(trimmed));
}

export function shortHash(hash: string): string {
  return hash.substring(0, 7);
}

export function validateDiffArguments(
  targetCommitish: string,
  baseCommitish?: string
): { valid: boolean; error?: string } {
  // Validate target commitish format
  if (!validateCommitish(targetCommitish)) {
    return { valid: false, error: 'Invalid target commit-ish format' };
  }

  // Validate base commitish format if provided
  if (baseCommitish !== undefined && !validateCommitish(baseCommitish)) {
    return { valid: false, error: 'Invalid base commit-ish format' };
  }

  // Special arguments are only allowed in target, not base
  const specialArgs = ['working', 'staged', '.'];
  if (baseCommitish && specialArgs.includes(baseCommitish)) {
    return {
      valid: false,
      error: `Special arguments (working, staged, .) are only allowed as target, not base. Got base: ${baseCommitish}`,
    };
  }

  // Cannot compare same values
  if (targetCommitish === baseCommitish) {
    return { valid: false, error: `Cannot compare ${targetCommitish} with itself` };
  }

  // "working" shows unstaged changes and cannot be compared with another commit
  if (targetCommitish === 'working' && baseCommitish) {
    return {
      valid: false,
      error:
        '"working" shows unstaged changes and cannot be compared with another commit. Use "." instead to compare all uncommitted changes with a specific commit.',
    };
  }

  return { valid: true };
}

export async function findUntrackedFiles(git: SimpleGit): Promise<string[]> {
  const status = await git.status();
  return status.not_added;
}

// Add files with --intent-to-add to make them visible in `git diff` without staging content
export async function markFilesIntentToAdd(git: SimpleGit, files: string[]): Promise<void> {
  await git.add(['--intent-to-add', ...files]);
}

export async function promptUser(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(message);
  rl.close();

  return ['y', 'yes'].includes(answer.trim().toLowerCase());
}
