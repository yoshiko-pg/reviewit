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
  if (trimmed === '.') {
    return true; // Allow '.' for working directory diff
  }

  const validPatterns = [
    /^[a-f0-9]{4,40}$/i, // SHA hashes
    /^HEAD(~\d+|\^\d*)*$/, // HEAD, HEAD~1, HEAD^, HEAD^2, etc.
    /^[a-zA-Z][a-zA-Z0-9_\-/.]*$/, // branch names, tags (must start with letter, no ^ or ~ in middle)
  ];

  return validPatterns.some((pattern) => pattern.test(trimmed));
}

type PromptCallbacks = {
  onYes: () => Promise<void> | void;
  onNo: () => Promise<void> | void;
};

export async function promptWithCallbacks(
  message: string,
  callbacks: PromptCallbacks
): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(message);
  rl.close();

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    await callbacks.onYes();
  } else {
    await callbacks.onNo();
  }
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
