// Gerrit-inspired keyboard navigation implementation
import { useState, useEffect, useCallback, useMemo } from 'react';

import type { DiffFile, Comment } from '../../types/diff';

// Cursor position representing current location in the diff
interface CursorPosition {
  fileIndex: number;
  chunkIndex: number;
  lineIndex: number;
  side: 'left' | 'right';
}

// Navigation target types (reserved for future use)
// type NavigationTarget = 'line' | 'chunk' | 'file' | 'comment';

// Filter function for navigation
type NavigationFilter = (position: CursorPosition, files: DiffFile[]) => boolean;

// Result of navigation attempt
interface NavigationResult {
  position: CursorPosition | null;
  scrollTarget: string | null;
}

interface UseKeyboardNavigationProps {
  files: DiffFile[];
  comments: Comment[];
  viewMode?: 'side-by-side' | 'inline';
  onToggleReviewed: (filePath: string) => void;
}

interface UseKeyboardNavigationReturn {
  cursor: CursorPosition | null;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
}

// Helper to create element ID from position
function getElementId(position: CursorPosition, viewMode: 'side-by-side' | 'inline'): string {
  const baseId = `file-${position.fileIndex}-chunk-${position.chunkIndex}-line-${position.lineIndex}`;
  return viewMode === 'side-by-side' ? `${baseId}-${position.side}` : baseId;
}

// Helper to get line type at position
function getLineType(
  position: CursorPosition,
  files: DiffFile[]
): 'add' | 'delete' | 'normal' | null {
  const line = files[position.fileIndex]?.chunks[position.chunkIndex]?.lines[position.lineIndex];
  if (!line) return null;
  // Filter out non-standard line types
  if (line.type === 'add' || line.type === 'delete' || line.type === 'normal') {
    return line.type;
  }
  return null;
}

// Helper to check if position has content on the current side
function hasContentOnSide(position: CursorPosition, files: DiffFile[]): boolean {
  const lineType = getLineType(position, files);
  if (!lineType) return false;

  if (lineType === 'normal') return true;
  if (lineType === 'delete') return position.side === 'left';
  if (lineType === 'add') return position.side === 'right';
  return false;
}

// Fix side if current position has no content (like Gerrit's fixSide)
function fixSide(position: CursorPosition, files: DiffFile[]): CursorPosition {
  if (!hasContentOnSide(position, files)) {
    return { ...position, side: position.side === 'left' ? 'right' : 'left' };
  }
  return position;
}

export function useKeyboardNavigation({
  files,
  comments,
  viewMode = 'inline',
  onToggleReviewed,
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [cursor, setCursor] = useState<CursorPosition | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Build comment index for efficient lookup
  const commentIndex = useMemo(() => {
    const index = new Map<string, Comment[]>();
    comments.forEach((comment) => {
      const lineNum = Array.isArray(comment.line) ? comment.line[0] : comment.line;
      const key = `${comment.file}:${lineNum}`;
      if (!index.has(key)) {
        index.set(key, []);
      }
      const commentList = index.get(key);
      if (commentList) {
        commentList.push(comment);
      }
    });
    return index;
  }, [comments]);

  // Scroll to element
  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }, []);

  // Core navigation function - finds next/prev position matching filter
  const navigate = useCallback(
    (direction: 'next' | 'prev', filter: NavigationFilter): NavigationResult => {
      if (files.length === 0) {
        return { position: null, scrollTarget: null };
      }

      // Start from current position or beginning
      let position = cursor || { fileIndex: 0, chunkIndex: 0, lineIndex: -1, side: 'right' };

      // Helper to move to next/prev position
      const advance = (pos: CursorPosition): CursorPosition | null => {
        let { fileIndex, chunkIndex, lineIndex } = pos;

        if (direction === 'next') {
          lineIndex++;

          // Check if we need to move to next chunk
          if (!files[fileIndex]?.chunks[chunkIndex]?.lines[lineIndex]) {
            chunkIndex++;
            lineIndex = 0;

            // Check if we need to move to next file
            if (!files[fileIndex]?.chunks[chunkIndex]) {
              fileIndex++;
              chunkIndex = 0;

              // Wrap around
              if (!files[fileIndex]) {
                fileIndex = 0;
              }
            }
          }
        } else {
          lineIndex--;

          // Check if we need to move to prev chunk
          if (lineIndex < 0) {
            chunkIndex--;

            // Check if we need to move to prev file
            if (chunkIndex < 0) {
              fileIndex--;

              // Wrap around
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
      };

      // Search for matching position
      let current: CursorPosition | null = position;
      let started = false;

      while (true) {
        if (!current) break;
        const nextPos: CursorPosition | null = advance(current);
        if (!nextPos) break;
        current = nextPos;

        // Check if we've wrapped around to start
        if (
          started &&
          current.fileIndex === position.fileIndex &&
          current.chunkIndex === position.chunkIndex &&
          current.lineIndex === position.lineIndex
        ) {
          break;
        }
        started = true;

        // Check if position matches filter
        if (filter(current, files)) {
          // Fix side if needed
          const fixed = fixSide(current, files);
          return {
            position: fixed,
            scrollTarget: getElementId(fixed, viewMode),
          };
        }
      }

      return { position: null, scrollTarget: null };
    },
    [cursor, files, viewMode]
  );

  // Navigation filters
  const filters = {
    // Line navigation - only lines with content on current side
    line: (pos: CursorPosition): boolean => {
      return viewMode === 'inline' || hasContentOnSide(pos, files);
    },

    // Chunk navigation - first line of change chunks
    chunk: (pos: CursorPosition): boolean => {
      const line = files[pos.fileIndex]?.chunks[pos.chunkIndex]?.lines[pos.lineIndex];
      if (!line || line.type === 'normal') return false;

      // Check if first line of chunk
      if (pos.lineIndex === 0) return true;

      const prevLine = files[pos.fileIndex]?.chunks[pos.chunkIndex]?.lines[pos.lineIndex - 1];
      return !prevLine || prevLine.type === 'normal';
    },

    // Comment navigation
    comment: (pos: CursorPosition): boolean => {
      const file = files[pos.fileIndex];
      if (!file) return false;

      const line = file.chunks[pos.chunkIndex]?.lines[pos.lineIndex];
      if (!line) return false;

      const lineNum = line.oldLineNumber || line.newLineNumber;
      if (!lineNum) return false;

      const key = `${file.path}:${lineNum}`;
      return commentIndex.has(key);
    },
  };

  // Navigation commands
  const navigateToLine = useCallback(
    (direction: 'next' | 'prev') => {
      const result = navigate(direction, filters.line);
      if (result.position) {
        setCursor(result.position);
        if (result.scrollTarget) {
          scrollToElement(result.scrollTarget);
        }
      }
    },
    [navigate, filters.line, scrollToElement]
  );

  const navigateToChunk = useCallback(
    (direction: 'next' | 'prev') => {
      const result = navigate(direction, filters.chunk);
      if (result.position) {
        setCursor(result.position);
        if (result.scrollTarget) {
          scrollToElement(result.scrollTarget);
        }
      }
    },
    [navigate, filters.chunk, scrollToElement]
  );

  const navigateToComment = useCallback(
    (direction: 'next' | 'prev') => {
      const result = navigate(direction, filters.comment);
      if (result.position) {
        setCursor(result.position);
        if (result.scrollTarget) {
          scrollToElement(result.scrollTarget);

          // Also scroll to comment after a delay
          const file = files[result.position.fileIndex];
          const line = file?.chunks[result.position.chunkIndex]?.lines[result.position.lineIndex];
          if (file && line) {
            const lineNum = line.oldLineNumber || line.newLineNumber;
            const key = `${file.path}:${lineNum}`;
            const comment = commentIndex.get(key)?.[0];
            if (comment) {
              setTimeout(() => scrollToElement(`comment-${comment.id}`), 100);
            }
          }
        }
      }
    },
    [navigate, filters.comment, scrollToElement, files, commentIndex]
  );

  const navigateToFile = useCallback(
    (direction: 'next' | 'prev') => {
      if (files.length === 0) return;

      // Calculate target file index
      let targetFileIndex = cursor?.fileIndex ?? -1;
      if (direction === 'next') {
        targetFileIndex = (targetFileIndex + 1) % files.length;
      } else {
        targetFileIndex = targetFileIndex <= 0 ? files.length - 1 : targetFileIndex - 1;
      }

      // Find the first navigable line in the target file
      const targetFile = files[targetFileIndex];
      if (!targetFile || targetFile.chunks.length === 0) return;

      // Look for the first line in the file
      for (let chunkIndex = 0; chunkIndex < targetFile.chunks.length; chunkIndex++) {
        const chunk = targetFile.chunks[chunkIndex];
        if (chunk && chunk.lines.length > 0) {
          // Create a position for the first line
          const position: CursorPosition = {
            fileIndex: targetFileIndex,
            chunkIndex,
            lineIndex: 0,
            side: cursor?.side ?? 'right',
          };

          // Fix side if needed
          const fixed = fixSide(position, files);
          setCursor(fixed);

          // Scroll to the file header first
          const fileElementId = `file-${targetFile.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
          scrollToElement(fileElementId);

          // Then highlight the first line
          setTimeout(() => {
            scrollToElement(getElementId(fixed, viewMode));
          }, 100);

          return;
        }
      }
    },
    [cursor, files, scrollToElement, viewMode]
  );

  const switchSide = useCallback(
    (side: 'left' | 'right') => {
      if (!cursor || viewMode !== 'side-by-side') return;

      const newCursor = { ...cursor, side };
      setCursor(newCursor);
      scrollToElement(getElementId(newCursor, viewMode));
    },
    [cursor, viewMode, scrollToElement]
  );

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          navigateToLine('next');
          break;
        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          navigateToLine('prev');
          break;
        case 'n':
          event.preventDefault();
          navigateToChunk('next');
          break;
        case 'p':
          event.preventDefault();
          navigateToChunk('prev');
          break;
        case 'N':
          if (event.shiftKey) {
            event.preventDefault();
            navigateToComment('next');
          }
          break;
        case 'P':
          if (event.shiftKey) {
            event.preventDefault();
            navigateToComment('prev');
          }
          break;
        case ']':
          event.preventDefault();
          navigateToFile('next');
          break;
        case '[':
          event.preventDefault();
          navigateToFile('prev');
          break;
        case 'h':
        case 'ArrowLeft':
          if (viewMode === 'side-by-side') {
            event.preventDefault();
            switchSide('left');
          }
          break;
        case 'l':
        case 'ArrowRight':
          if (viewMode === 'side-by-side') {
            event.preventDefault();
            switchSide('right');
          }
          break;
        case 'r':
          event.preventDefault();
          if (cursor) {
            const file = files[cursor.fileIndex];
            if (file) {
              onToggleReviewed(file.path);
            }
          }
          break;
        case 'c':
          event.preventDefault();
          // TODO: Implement comment creation
          break;
        case '?':
          event.preventDefault();
          setIsHelpOpen(!isHelpOpen);
          break;
      }
    },
    [
      navigateToLine,
      navigateToChunk,
      navigateToComment,
      navigateToFile,
      switchSide,
      viewMode,
      cursor,
      files,
      onToggleReviewed,
      isHelpOpen,
    ]
  );

  // Register keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    cursor,
    isHelpOpen,
    setIsHelpOpen,
  };
}
