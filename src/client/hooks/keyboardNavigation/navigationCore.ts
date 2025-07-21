import type { DiffFile } from '../../../types/diff';

import { fixSide, getElementId } from './helpers';
import type {
  CursorPosition,
  NavigationDirection,
  NavigationFilter,
  NavigationResult,
} from './types';

/**
 * Get the starting position for navigation
 */
export function getStartPosition(cursor: CursorPosition | null): CursorPosition {
  return cursor || { fileIndex: 0, chunkIndex: 0, lineIndex: -1, side: 'right' };
}

/**
 * Check if we've wrapped around to the starting position
 */
export function hasWrappedAround(
  current: CursorPosition,
  start: CursorPosition,
  started: boolean
): boolean {
  return (
    started &&
    current.fileIndex === start.fileIndex &&
    current.chunkIndex === start.chunkIndex &&
    current.lineIndex === start.lineIndex
  );
}

/**
 * Advance to the next position in the given direction
 */
export function advancePosition(
  pos: CursorPosition,
  direction: NavigationDirection,
  files: DiffFile[]
): CursorPosition | null {
  let { fileIndex, chunkIndex, lineIndex } = pos;

  if (direction === 'next') {
    lineIndex++;

    // Move to next chunk if needed
    if (!files[fileIndex]?.chunks[chunkIndex]?.lines[lineIndex]) {
      chunkIndex++;
      lineIndex = 0;

      // Move to next file if needed
      if (!files[fileIndex]?.chunks[chunkIndex]) {
        fileIndex++;
        chunkIndex = 0;

        // Wrap around to beginning
        if (!files[fileIndex]) {
          fileIndex = 0;
        }
      }
    }
  } else {
    lineIndex--;

    // Move to previous chunk if needed
    if (lineIndex < 0) {
      chunkIndex--;

      // Move to previous file if needed
      if (chunkIndex < 0) {
        fileIndex--;

        // Wrap around to end
        if (fileIndex < 0) {
          fileIndex = files.length - 1;
        }

        const file = files[fileIndex];
        if (file) {
          chunkIndex = file.chunks.length - 1;
        }
      }

      const chunk = files[fileIndex]?.chunks[chunkIndex];
      if (chunk) {
        lineIndex = chunk.lines.length - 1;
      }
    }
  }

  // Validate position
  if (!files[fileIndex]?.chunks[chunkIndex]?.lines[lineIndex]) {
    return null;
  }

  return { ...pos, fileIndex, chunkIndex, lineIndex };
}

/**
 * Search for the next position matching the filter
 */
export function findNextMatchingPosition(
  startPos: CursorPosition,
  direction: NavigationDirection,
  filter: NavigationFilter,
  files: DiffFile[],
  viewMode: 'side-by-side' | 'inline'
): NavigationResult {
  let current: CursorPosition | null = startPos;
  let started = false;

  while (true) {
    if (!current) break;

    const nextPos = advancePosition(current, direction, files);
    if (!nextPos) break;

    current = nextPos;

    // Check if we've wrapped around to start
    if (hasWrappedAround(current, startPos, started)) {
      break;
    }
    started = true;

    // Check if position matches filter
    if (filter(current, files)) {
      const fixed = fixSide(current, files);
      return {
        position: fixed,
        scrollTarget: getElementId(fixed, viewMode),
      };
    }
  }

  return { position: null, scrollTarget: null };
}
