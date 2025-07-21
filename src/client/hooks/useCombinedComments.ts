import { useMemo } from 'react';

import { type DiffComment } from '../../types/diff';

import { useDiffComments, type UseDiffCommentsReturn } from './useDiffComments';
import { useLocalComments } from './useLocalComments';

/**
 * Combined comments hook that provides both old and new comment systems
 * This allows for gradual migration while maintaining backwards compatibility
 */
export function useCombinedComments(
  commitHash?: string,
  baseCommitish?: string,
  targetCommitish?: string,
  currentCommitHash?: string,
  branchToHash?: Map<string, string>,
  useNewSystem: boolean = false
) {
  // Old system
  const oldSystem = useLocalComments(commitHash);

  // New system
  const newSystem = useDiffComments(
    baseCommitish,
    targetCommitish,
    currentCommitHash,
    branchToHash
  );

  // Convert old comments to new format for unified display
  const convertedOldComments = useMemo((): DiffComment[] => {
    if (useNewSystem) return [];

    return oldSystem.comments.map((comment) => ({
      id: comment.id,
      filePath: comment.file,
      body: comment.body,
      createdAt: comment.timestamp,
      updatedAt: comment.timestamp,
      chunkHeader: '', // Not available in old format
      position: {
        side: 'new' as const, // Old system doesn't track side
        line:
          typeof comment.line === 'number' ?
            comment.line
          : { start: comment.line[0], end: comment.line[1] },
      },
      codeSnapshot:
        comment.codeContent ?
          {
            content: comment.codeContent,
            language: undefined,
          }
        : undefined,
    }));
  }, [oldSystem.comments, useNewSystem]);

  // Merged comments for display
  const allComments = useMemo(() => {
    return useNewSystem ? newSystem.comments : convertedOldComments;
  }, [useNewSystem, newSystem.comments, convertedOldComments]);

  // Wrapper functions that delegate to the appropriate system
  const addComment: UseDiffCommentsReturn['addComment'] = (params) => {
    if (useNewSystem) {
      return newSystem.addComment(params);
    } else {
      // Convert to old format
      const lineNumber =
        typeof params.line === 'number' ?
          params.line
        : ([params.line.start, params.line.end] as [number, number]);

      const oldComment = oldSystem.addComment(
        params.filePath,
        lineNumber,
        params.body,
        params.codeSnapshot?.content
      );

      // Convert back to new format for consistency
      return {
        id: oldComment.id,
        filePath: oldComment.file,
        body: oldComment.body,
        createdAt: oldComment.timestamp,
        updatedAt: oldComment.timestamp,
        chunkHeader: params.chunkHeader,
        position: {
          side: params.side,
          line: params.line,
        },
        codeSnapshot: params.codeSnapshot,
      };
    }
  };

  const removeComment = (commentId: string) => {
    if (useNewSystem) {
      newSystem.removeComment(commentId);
    } else {
      oldSystem.removeComment(commentId);
    }
  };

  const updateComment = (commentId: string, newBody: string) => {
    if (useNewSystem) {
      newSystem.updateComment(commentId, newBody);
    } else {
      oldSystem.updateComment(commentId, newBody);
    }
  };

  const clearAllComments = () => {
    if (useNewSystem) {
      newSystem.clearAllComments();
    } else {
      oldSystem.clearAllComments();
    }
  };

  const generatePrompt = (commentId: string): string => {
    if (useNewSystem) {
      return newSystem.generatePrompt(commentId);
    } else {
      const comment = oldSystem.comments.find((c) => c.id === commentId);
      return comment ? oldSystem.generatePrompt(comment) : '';
    }
  };

  const generateAllCommentsPrompt = (): string => {
    if (useNewSystem) {
      return newSystem.generateAllCommentsPrompt();
    } else {
      return oldSystem.generateAllCommentsPrompt();
    }
  };

  return {
    comments: allComments,
    oldComments: oldSystem.comments,
    newComments: newSystem.comments,
    addComment,
    removeComment,
    updateComment,
    clearAllComments,
    generatePrompt,
    generateAllCommentsPrompt,
    isUsingNewSystem: useNewSystem,
  };
}
