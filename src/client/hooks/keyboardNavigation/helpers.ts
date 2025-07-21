import type { DiffFile } from '../../../types/diff';

import type { CursorPosition, ViewMode } from './types';

/**
 * Creates a DOM element ID from a cursor position
 * Format: file-{fileIndex}-chunk-{chunkIndex}-line-{lineIndex}[-{side}]
 */
export function getElementId(position: CursorPosition, viewMode: ViewMode): string {
  const baseId = `file-${position.fileIndex}-chunk-${position.chunkIndex}-line-${position.lineIndex}`;
  return viewMode === 'side-by-side' ? `${baseId}-${position.side}` : baseId;
}

/**
 * Gets the line type at a given position
 * Returns null if the position is invalid or has unsupported line type
 */
export function getLineType(
  position: CursorPosition,
  files: DiffFile[]
): 'add' | 'delete' | 'normal' | null {
  const line = files[position.fileIndex]?.chunks[position.chunkIndex]?.lines[position.lineIndex];
  if (!line) return null;

  // Only return standard diff line types
  if (line.type === 'add' || line.type === 'delete' || line.type === 'normal') {
    return line.type;
  }
  return null;
}

/**
 * Checks if a position has content on the specified side
 * - normal lines have content on both sides
 * - delete lines only have content on the left
 * - add lines only have content on the right
 */
export function hasContentOnSide(position: CursorPosition, files: DiffFile[]): boolean {
  const lineType = getLineType(position, files);
  if (!lineType) return false;

  if (lineType === 'normal') return true;
  if (lineType === 'delete') return position.side === 'left';
  if (lineType === 'add') return position.side === 'right';
  return false;
}

/**
 * Adjusts the cursor side if the current position has no content
 * This ensures the cursor is always on a side with visible content
 */
export function fixSide(position: CursorPosition, files: DiffFile[]): CursorPosition {
  if (!hasContentOnSide(position, files)) {
    return { ...position, side: position.side === 'left' ? 'right' : 'left' };
  }
  return position;
}

/**
 * Creates a comment lookup key from file path and line number
 */
export function getCommentKey(filePath: string, lineNumber: number): string {
  return `${filePath}:${lineNumber}`;
}
