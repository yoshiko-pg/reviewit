import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { type DiffComment } from '../../types/diff';
import { storageService } from '../services/StorageService';
import { getLanguageFromPath } from '../utils/diffUtils';

export interface AddCommentParams {
  filePath: string;
  body: string;
  side: 'old' | 'new';
  line: number | { start: number; end: number };
  chunkHeader: string;
  codeSnapshot?: DiffComment['codeSnapshot'];
}

export interface UseDiffCommentsReturn {
  comments: DiffComment[];
  addComment: (params: AddCommentParams) => DiffComment;
  removeComment: (commentId: string) => void;
  updateComment: (commentId: string, newBody: string) => void;
  clearAllComments: () => void;
  generatePrompt: (commentId: string) => string;
  generateAllCommentsPrompt: () => string;
}

export function useDiffComments(
  baseCommitish?: string,
  targetCommitish?: string,
  currentCommitHash?: string,
  branchToHash?: Map<string, string>
): UseDiffCommentsReturn {
  const [comments, setComments] = useState<DiffComment[]>([]);

  // Load comments from storage
  useEffect(() => {
    if (!baseCommitish || !targetCommitish) return;

    const loadedComments = storageService.getComments(
      baseCommitish,
      targetCommitish,
      currentCommitHash,
      branchToHash
    );
    setComments(loadedComments);
  }, [baseCommitish, targetCommitish, currentCommitHash, branchToHash]);

  // Save comments to storage
  const saveComments = useCallback(
    (newComments: DiffComment[]) => {
      if (!baseCommitish || !targetCommitish) return;

      storageService.saveComments(
        baseCommitish,
        targetCommitish,
        newComments,
        currentCommitHash,
        branchToHash
      );
      setComments(newComments);
    },
    [baseCommitish, targetCommitish, currentCommitHash, branchToHash]
  );

  const addComment = useCallback(
    (params: AddCommentParams): DiffComment => {
      const newComment: DiffComment = {
        id: uuidv4(),
        filePath: params.filePath,
        body: params.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chunkHeader: params.chunkHeader,
        position: {
          side: params.side,
          line: params.line,
        },
        codeSnapshot: params.codeSnapshot || {
          content: '',
          language: getLanguageFromPath(params.filePath),
        },
      };

      const newComments = [...comments, newComment];
      saveComments(newComments);
      return newComment;
    },
    [comments, saveComments]
  );

  const removeComment = useCallback(
    (commentId: string) => {
      const newComments = comments.filter((c) => c.id !== commentId);
      saveComments(newComments);
    },
    [comments, saveComments]
  );

  const updateComment = useCallback(
    (commentId: string, newBody: string) => {
      const newComments = comments.map((c) =>
        c.id === commentId ? { ...c, body: newBody, updatedAt: new Date().toISOString() } : c
      );
      saveComments(newComments);
    },
    [comments, saveComments]
  );

  const clearAllComments = useCallback(() => {
    saveComments([]);
  }, [saveComments]);

  const generatePrompt = useCallback(
    (commentId: string): string => {
      const comment = comments.find((c) => c.id === commentId);
      if (!comment) return '';

      const lineInfo =
        typeof comment.position.line === 'number' ?
          `line ${comment.position.line}`
        : `lines ${comment.position.line.start}-${comment.position.line.end}`;

      let prompt = `# Comment on ${comment.filePath} (${comment.position.side} side, ${lineInfo})\n\n`;
      prompt += `**Comment:** ${comment.body}\n\n`;

      if (comment.codeSnapshot?.content) {
        prompt += `**Code context:**\n\`\`\`${comment.codeSnapshot.language || ''}\n`;
        prompt += `${comment.codeSnapshot.content}\n\`\`\`\n\n`;
      }

      prompt += `**Chunk header:** ${comment.chunkHeader}\n`;
      prompt += `**Created at:** ${comment.createdAt}\n`;

      return prompt;
    },
    [comments]
  );

  const generateAllCommentsPrompt = useCallback((): string => {
    if (comments.length === 0) return 'No comments in this diff context.';

    let prompt = `# All Comments for diff: ${baseCommitish} → ${targetCommitish}\n\n`;
    prompt += `Total comments: ${comments.length}\n\n`;

    // Group by file
    const commentsByFile = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.filePath]) {
          acc[comment.filePath] = [];
        }
        const fileComments = acc[comment.filePath];
        if (fileComments) {
          fileComments.push(comment);
        }
        return acc;
      },
      {} as Record<string, DiffComment[]>
    );

    Object.entries(commentsByFile).forEach(([filePath, fileComments]) => {
      prompt += `## ${filePath} (${fileComments.length} comments)\n\n`;

      fileComments.forEach((comment, index) => {
        const lineInfo =
          typeof comment.position.line === 'number' ?
            `line ${comment.position.line}`
          : `lines ${comment.position.line.start}-${comment.position.line.end}`;

        prompt += `### Comment ${index + 1} (${comment.position.side} side, ${lineInfo})\n`;
        prompt += `${comment.body}\n\n`;
      });
    });

    return prompt;
  }, [comments, baseCommitish, targetCommitish]);

  return {
    comments,
    addComment,
    removeComment,
    updateComment,
    clearAllComments,
    generatePrompt,
    generateAllCommentsPrompt,
  };
}
