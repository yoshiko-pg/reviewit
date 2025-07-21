import { useState, useEffect, useCallback, useMemo } from 'react';

import type { Comment } from '../../types/diff';

import {
  type CursorPosition,
  type NavigationDirection,
  type NavigationFilter,
  type NavigationResult,
  type UseKeyboardNavigationProps,
  type UseKeyboardNavigationReturn,
  getElementId,
  fixSide,
  getCommentKey,
  hasContentOnSide,
  createNavigationFilters,
  createScrollToElement,
} from './keyboardNavigation';

/**
 * Keyboard navigation hook for diff viewer
 * Provides Gerrit-style keyboard shortcuts for navigating through diffs
 */
export function useKeyboardNavigation({
  files,
  comments,
  viewMode = 'inline',
  onToggleReviewed,
  onCreateComment,
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [cursor, setCursor] = useState<CursorPosition | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Create scroll function
  const scrollToElement = useMemo(() => createScrollToElement(), []);

  // Build comment index for efficient lookup
  const commentIndex = useMemo(() => {
    const index = new Map<string, Comment[]>();
    comments.forEach((comment) => {
      const lineNum = Array.isArray(comment.line) ? comment.line[0] : comment.line;
      const key = getCommentKey(comment.file, lineNum);
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)?.push(comment);
    });
    return index;
  }, [comments]);

  // Create navigation filters
  const filters = useMemo(
    () => createNavigationFilters(files, commentIndex, viewMode),
    [files, commentIndex, viewMode]
  );

  // Core navigation function - finds next/prev position matching filter
  const navigate = useCallback(
    (direction: NavigationDirection, filter: NavigationFilter): NavigationResult => {
      if (files.length === 0) {
        return { position: null, scrollTarget: null };
      }

      // Start from current position or beginning
      let position = cursor || { fileIndex: 0, chunkIndex: 0, lineIndex: -1, side: 'right' };

      // Helper to advance position
      const advance = (pos: CursorPosition): CursorPosition | null => {
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
      };

      // Search for matching position
      let current: CursorPosition | null = position;
      let started = false;

      while (true) {
        if (!current) break;

        const nextPos = advance(current);
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

  // Create navigation commands
  const createNavigationCommand = useCallback(
    (filter: NavigationFilter) => {
      return (direction: NavigationDirection) => {
        const result = navigate(direction, filter);
        if (result.position) {
          setCursor(result.position);
          if (result.scrollTarget) {
            scrollToElement(result.scrollTarget);
          }
        }
      };
    },
    [navigate, scrollToElement]
  );

  // Navigation commands
  const navigateToLine = useMemo(
    () => createNavigationCommand(filters.line),
    [createNavigationCommand, filters.line]
  );

  const navigateToChunk = useMemo(
    () => createNavigationCommand(filters.chunk),
    [createNavigationCommand, filters.chunk]
  );

  const navigateToFile = useMemo(
    () => createNavigationCommand(filters.file),
    [createNavigationCommand, filters.file]
  );

  // Navigation to comments
  const navigateToComment = useMemo(
    () => createNavigationCommand(filters.comment),
    [createNavigationCommand, filters.comment]
  );

  // Switch between left and right sides in side-by-side mode
  const switchSide = useCallback(
    (side: 'left' | 'right') => {
      if (!cursor || viewMode !== 'side-by-side') return;

      // Create new cursor with the requested side
      let newCursor = { ...cursor, side };

      // Special handling for delete/add pairs in side-by-side view
      // These appear on the same visual line but are different line indices
      const currentLine =
        files[cursor.fileIndex]?.chunks[cursor.chunkIndex]?.lines[cursor.lineIndex];
      if (currentLine) {
        // If switching from right (add) to left (delete), check if previous line is a delete
        if (side === 'left' && currentLine.type === 'add' && cursor.lineIndex > 0) {
          const prevLine =
            files[cursor.fileIndex]?.chunks[cursor.chunkIndex]?.lines[cursor.lineIndex - 1];
          if (prevLine?.type === 'delete') {
            // Move to the delete line that pairs with this add line
            newCursor = { ...newCursor, lineIndex: cursor.lineIndex - 1 };
            setCursor(newCursor);
            scrollToElement(getElementId(newCursor, viewMode));
            return;
          }
        }
        // If switching from left (delete) to right (add), check if next line is an add
        else if (side === 'right' && currentLine.type === 'delete') {
          const nextLine =
            files[cursor.fileIndex]?.chunks[cursor.chunkIndex]?.lines[cursor.lineIndex + 1];
          if (nextLine?.type === 'add') {
            // Move to the add line that pairs with this delete line
            newCursor = { ...newCursor, lineIndex: cursor.lineIndex + 1 };
            setCursor(newCursor);
            scrollToElement(getElementId(newCursor, viewMode));
            return;
          }
        }
      }

      // Check if the new position has content
      if (!hasContentOnSide(newCursor, files)) {
        // Find the nearest line with content on the target side
        const file = files[cursor.fileIndex];
        if (!file) return;

        // First, try to find a line in the current chunk
        const currentChunk = file.chunks[cursor.chunkIndex];
        if (currentChunk) {
          // Search forward from current position
          for (let i = cursor.lineIndex + 1; i < currentChunk.lines.length; i++) {
            const testPos = { ...newCursor, lineIndex: i };
            if (hasContentOnSide(testPos, files)) {
              newCursor = testPos;
              break;
            }
          }

          // If not found forward, search backward
          if (!hasContentOnSide(newCursor, files)) {
            for (let i = cursor.lineIndex - 1; i >= 0; i--) {
              const testPos = { ...newCursor, lineIndex: i };
              if (hasContentOnSide(testPos, files)) {
                newCursor = testPos;
                break;
              }
            }
          }
        }

        // If still no content found in current chunk, search other chunks
        if (!hasContentOnSide(newCursor, files)) {
          // Search forward chunks
          for (let chunkIdx = cursor.chunkIndex + 1; chunkIdx < file.chunks.length; chunkIdx++) {
            const chunk = file.chunks[chunkIdx];
            if (!chunk) continue;
            for (let lineIdx = 0; lineIdx < chunk.lines.length; lineIdx++) {
              const testPos = { ...newCursor, chunkIndex: chunkIdx, lineIndex: lineIdx };
              if (hasContentOnSide(testPos, files)) {
                newCursor = testPos;
                break;
              }
            }
            if (hasContentOnSide(newCursor, files)) break;
          }

          // If still not found, search backward chunks
          if (!hasContentOnSide(newCursor, files)) {
            for (let chunkIdx = cursor.chunkIndex - 1; chunkIdx >= 0; chunkIdx--) {
              const chunk = file.chunks[chunkIdx];
              if (!chunk) continue;
              for (let lineIdx = chunk.lines.length - 1; lineIdx >= 0; lineIdx--) {
                const testPos = { ...newCursor, chunkIndex: chunkIdx, lineIndex: lineIdx };
                if (hasContentOnSide(testPos, files)) {
                  newCursor = testPos;
                  break;
                }
              }
              if (hasContentOnSide(newCursor, files)) break;
            }
          }
        }
      }

      // Update cursor and scroll
      setCursor(newCursor);
      scrollToElement(getElementId(newCursor, viewMode));
    },
    [cursor, viewMode, scrollToElement, files]
  );

  // Move cursor to center of viewport
  const moveToCenterOfViewport = useCallback(() => {
    // Get the scrollable container
    const scrollContainer = document.querySelector('main.overflow-y-auto') as HTMLElement | null;
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;

    // Find all diff line elements
    let closestDistance = Infinity;
    let closestPosition: CursorPosition | null = null;

    // Iterate through all files and lines to find the one closest to center
    files.forEach((file, fileIndex) => {
      file.chunks.forEach((chunk, chunkIndex) => {
        chunk.lines.forEach((_, lineIndex) => {
          // Check both sides in side-by-side mode
          const sides =
            viewMode === 'side-by-side' ? (['left', 'right'] as const) : (['right'] as const);

          for (const side of sides) {
            const position: CursorPosition = { fileIndex, chunkIndex, lineIndex, side };

            // Skip positions without content in side-by-side mode
            if (viewMode === 'side-by-side' && !hasContentOnSide(position, files)) {
              continue;
            }

            const elementId = getElementId(position, viewMode);
            const element = document.getElementById(elementId);

            if (element) {
              const rect = element.getBoundingClientRect();
              const elementCenterY = rect.top + rect.height / 2;
              const distance = Math.abs(elementCenterY - centerY);

              // Check if element is visible
              if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestPosition = position;
                }
              }
            }
          }
        });
      });
    });

    // Set cursor to the closest position
    if (closestPosition) {
      setCursor(closestPosition);
      // Don't scroll since we're moving to already visible content
    }
  }, [files, viewMode, setCursor]);

  // Set cursor position from external source (e.g., mouse click)
  const setCursorPosition = useCallback(
    (position: CursorPosition) => {
      // Fix the side if necessary
      const fixedPosition = fixSide(position, files);
      setCursor(fixedPosition);
      scrollToElement(getElementId(fixedPosition, viewMode));
    },
    [files, viewMode, scrollToElement]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        // Line navigation
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

        // Chunk navigation
        case 'n':
          event.preventDefault();
          navigateToChunk('next');
          break;
        case 'p':
          event.preventDefault();
          navigateToChunk('prev');
          break;

        // Comment navigation
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

        // File navigation
        case ']':
          event.preventDefault();
          navigateToFile('next');
          break;
        case '[':
          event.preventDefault();
          navigateToFile('prev');
          break;

        // Side switching (side-by-side mode only)
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

        // File review toggle
        case 'r':
          event.preventDefault();
          if (cursor) {
            const file = files[cursor.fileIndex];
            if (file) {
              onToggleReviewed(file.path);
            }
          }
          break;

        // Comment creation
        case 'c':
          event.preventDefault();
          if (cursor && onCreateComment) {
            // Get the current line
            const line =
              files[cursor.fileIndex]?.chunks[cursor.chunkIndex]?.lines[cursor.lineIndex];
            // Only create comment if not on a deleted line
            if (line && line.type !== 'delete') {
              onCreateComment();
            }
          }
          break;

        // Help toggle
        case '?':
          event.preventDefault();
          setIsHelpOpen(!isHelpOpen);
          break;

        // Move to center of viewport
        case '.':
          event.preventDefault();
          moveToCenterOfViewport();
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
      onCreateComment,
      isHelpOpen,
      moveToCenterOfViewport,
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
    setCursorPosition,
  };
}
