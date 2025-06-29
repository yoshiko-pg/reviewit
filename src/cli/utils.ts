export function validateCommitish(commitish: string): boolean {
  if (!commitish || typeof commitish !== 'string') {
    return false;
  }

  const trimmed = commitish.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const validPatterns = [/^[a-f0-9]{4,40}$/i, /^HEAD(~\d+)?$/, /^[a-zA-Z0-9_\-/.]+$/];

  return validPatterns.some((pattern) => pattern.test(trimmed));
}
