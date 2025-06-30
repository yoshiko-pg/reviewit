import { execFile } from 'child_process';
import { promisify } from 'util';

import simpleGit from 'simple-git';

const execFileAsync = promisify(execFile);

export interface PullRequestInfo {
  owner: string;
  repo: string;
  number: number;
}

export function parsePRUrl(url: string): PullRequestInfo | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
  };
}

export async function validatePRRemote(
  prInfo: PullRequestInfo
): Promise<{ isValid: boolean; remoteName?: string; error?: string }> {
  const git = simpleGit();

  // Find the correct remote for this repository
  const remotes = await git.getRemotes(true);
  let remoteName: string | null = null;

  for (const remote of remotes) {
    if (remote.refs.fetch && remote.refs.fetch.includes(`${prInfo.owner}/${prInfo.repo}`)) {
      remoteName = remote.name;
      break;
    }
  }

  if (!remoteName) {
    const suggestedRemoteName = prInfo.owner === 'origin' ? 'upstream' : prInfo.owner;
    const remoteAddCommand = `git remote add ${suggestedRemoteName} https://github.com/${prInfo.owner}/${prInfo.repo}.git`;

    return {
      isValid: false,
      error:
        `No remote found for repository ${prInfo.owner}/${prInfo.repo}.\n\n` +
        `To fetch this PR, you need to add the remote first:\n` +
        `  ${remoteAddCommand}\n\n` +
        `Then try again with the PR URL.`,
    };
  }

  return { isValid: true, remoteName };
}

export async function preparePRForDiff(
  prInfo: PullRequestInfo,
  remoteName: string
): Promise<{ headBranch: string; baseBranch: string }> {
  const git = simpleGit();

  try {
    // Configure git to fetch pull request refs
    await git.raw([
      'config',
      '--local',
      `remote.${remoteName}.fetch`,
      `+refs/pull/*/head:refs/remotes/${remoteName}/pr/*`,
    ]);

    // Fetch the PR branch
    await git.fetch([remoteName]);

    // Get PR info using GitHub API (we'll use gh command for simplicity)
    let baseBranch = 'main';
    try {
      const { stdout } = await execFileAsync('gh', [
        'pr',
        'view',
        String(prInfo.number),
        '--repo',
        `${prInfo.owner}/${prInfo.repo}`,
        '--json',
        'baseRefName,headRefName',
      ]);
      const prData = JSON.parse(stdout);
      baseBranch = prData.baseRefName;

      // Fetch base branch to ensure we have latest
      await git.fetch([remoteName, baseBranch]);
    } catch {
      // Fallback to main/master if gh command fails
      console.warn('Failed to get PR info via gh command, trying to fetch main branch');
      try {
        await git.fetch([remoteName, 'main']);
      } catch {
        try {
          await git.fetch([remoteName, 'master']);
          baseBranch = 'master';
        } catch {
          console.warn('Could not fetch base branch, will use whatever is available');
        }
      }
    }

    // Use remote references directly without checking out
    const prRemoteRef = `${remoteName}/pr/${prInfo.number}`;
    const baseRemoteRef = `${remoteName}/${baseBranch}`;

    return {
      headBranch: prRemoteRef,
      baseBranch: baseRemoteRef,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch PR #${prInfo.number}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
