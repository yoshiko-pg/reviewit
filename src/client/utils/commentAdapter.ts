import { type Comment, type DiffComment, type LineNumber } from '../../types/diff';

/**
 * Adapter function to convert DiffComment to legacy Comment format
 * Used during the migration period from the old comment system to the new one
 */
export function diffCommentToComment(diffComment: DiffComment): Comment {
  const line = diffComment.position.line;
  const lineNumber: LineNumber = typeof line === 'number' ? line : [line.start, line.end];

  return {
    id: diffComment.id,
    file: diffComment.filePath,
    line: lineNumber,
    body: diffComment.body,
    timestamp: diffComment.createdAt,
    codeContent: diffComment.codeSnapshot?.content,
  };
}

/**
 * Convert an array of DiffComments to Comments
 */
export function diffCommentsToComments(diffComments: DiffComment[]): Comment[] {
  return diffComments.map(diffCommentToComment);
}
