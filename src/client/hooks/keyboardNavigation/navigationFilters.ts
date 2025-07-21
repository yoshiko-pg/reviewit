import type { DiffFile, Comment } from '../../../types/diff';

import { hasContentOnSide, getCommentKey } from './helpers';
import type { CursorPosition, ViewMode } from './types';

/**
 * Creates navigation filters for different navigation targets
 */
export function createNavigationFilters(
  files: DiffFile[],
  commentIndex: Map<string, Comment[]>,
  viewMode: ViewMode
) {
  return {
    /**
     * Line navigation - navigates to lines with content on the current side
     * In inline mode, all lines are navigable
     * In side-by-side mode, only lines with content on the current side
     */
    line: (pos: CursorPosition): boolean => {
      return viewMode === 'inline' || hasContentOnSide(pos, files);
    },

    /**
     * Chunk navigation - navigates to the first line of each change chunk
     * Skips normal (unchanged) lines and finds boundaries between chunks
     */
    chunk: (pos: CursorPosition): boolean => {
      const line = files[pos.fileIndex]?.chunks[pos.chunkIndex]?.lines[pos.lineIndex];
      if (!line || line.type === 'normal') return false;

      // First line of a chunk is always a chunk boundary
      if (pos.lineIndex === 0) return true;

      // Check if previous line is normal (indicating start of a change chunk)
      const prevLine = files[pos.fileIndex]?.chunks[pos.chunkIndex]?.lines[pos.lineIndex - 1];
      return !prevLine || prevLine.type === 'normal';
    },

    /**
     * Comment navigation - navigates to lines that have comments
     */
    comment: (pos: CursorPosition): boolean => {
      const file = files[pos.fileIndex];
      if (!file) return false;

      const line = file.chunks[pos.chunkIndex]?.lines[pos.lineIndex];
      if (!line) return false;

      const lineNum = line.oldLineNumber || line.newLineNumber;
      if (!lineNum) return false;

      const key = getCommentKey(file.path, lineNum);
      return commentIndex.has(key);
    },

    /**
     * File navigation - navigates to the first line of each file
     */
    file: (pos: CursorPosition): boolean => {
      return pos.chunkIndex === 0 && pos.lineIndex === 0;
    },
  };
}

/**
 * Type for the navigation filters object
 */
export type NavigationFilters = ReturnType<typeof createNavigationFilters>;
