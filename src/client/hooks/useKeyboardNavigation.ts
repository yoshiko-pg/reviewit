import { useState, useEffect, useCallback, useMemo } from 'react';

import type { DiffFile, Comment } from '../../types/diff';

interface UseKeyboardNavigationProps {
  files: DiffFile[];
  comments: Comment[];
  onToggleReviewed: (filePath: string) => void;
}

interface NavigableLine {
  id: string; // Unique ID: "file-{fileIndex}-chunk-{chunkIndex}-line-{lineIndex}"
  fileIndex: number;
  chunkIndex: number;
  lineIndex: number; // Index within the chunk
  type: 'add' | 'delete' | 'normal';
  oldLineNumber?: number;
  newLineNumber?: number;
  side?: 'left' | 'right'; // Which side this line appears on in side-by-side view
}

interface UseKeyboardNavigationReturn {
  currentFileIndex: number;
  currentHunkIndex: number;
  currentLineId: string | null;
  currentSide: 'left' | 'right'; // Track which side is focused in side-by-side mode
  currentCommentIndex: number;
  isHelpOpen: boolean;
  setCurrentFileIndex: (index: number) => void;
  setCurrentHunkIndex: (index: number) => void;
  setCurrentLineId: (id: string | null) => void;
  setCurrentSide: (side: 'left' | 'right') => void;
  setCurrentCommentIndex: (index: number) => void;
  setIsHelpOpen: (open: boolean) => void;
}

export function useKeyboardNavigation({
  files,
  comments,
  onToggleReviewed,
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [currentHunkIndex, setCurrentHunkIndex] = useState(-1);
  const [currentLineId, setCurrentLineId] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<'left' | 'right'>('right');
  const [currentCommentIndex, setCurrentCommentIndex] = useState(-1);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Create a flat list of all navigable lines with unique IDs
  const allLines = useMemo(() => {
    const lines: NavigableLine[] = [];

    files.forEach((file, fileIndex) => {
      file.chunks.forEach((chunk, hunkIndex) => {
        chunk.lines.forEach((line, lineIndex) => {
          // Include all lines, not just add/delete
          const id = `file-${fileIndex}-chunk-${hunkIndex}-line-${lineIndex}`;

          // Determine which side(s) this line appears on
          if (line.type === 'normal') {
            // Normal lines appear on both sides
            lines.push({
              id,
              fileIndex,
              chunkIndex: hunkIndex,
              lineIndex,
              type: line.type,
              oldLineNumber: line.oldLineNumber,
              newLineNumber: line.newLineNumber,
              side: 'left',
            });
            lines.push({
              id,
              fileIndex,
              chunkIndex: hunkIndex,
              lineIndex,
              type: line.type,
              oldLineNumber: line.oldLineNumber,
              newLineNumber: line.newLineNumber,
              side: 'right',
            });
          } else if (line.type === 'delete') {
            // Delete lines only on left
            lines.push({
              id,
              fileIndex,
              chunkIndex: hunkIndex,
              lineIndex,
              type: line.type,
              oldLineNumber: line.oldLineNumber,
              newLineNumber: line.newLineNumber,
              side: 'left',
            });
          } else if (line.type === 'add') {
            // Add lines only on right
            lines.push({
              id,
              fileIndex,
              chunkIndex: hunkIndex,
              lineIndex,
              type: line.type,
              oldLineNumber: line.oldLineNumber,
              newLineNumber: line.newLineNumber,
              side: 'right',
            });
          }
        });
      });
    });
    return lines;
  }, [files]);

  // Sort comments by file and line number
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const fileCompare = a.file.localeCompare(b.file);
      if (fileCompare !== 0) return fileCompare;

      // Handle LineNumber type (number | [number, number])
      const aLine = Array.isArray(a.line) ? a.line[0] : a.line;
      const bLine = Array.isArray(b.line) ? b.line[0] : b.line;
      return aLine - bLine;
    });
  }, [comments]);

  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }, []);

  const navigateToFile = useCallback(
    (index: number) => {
      if (files.length === 0) return;

      const newIndex = ((index % files.length) + files.length) % files.length;
      setCurrentFileIndex(newIndex);
      setCurrentHunkIndex(-1);
      setCurrentLineId(null);

      const file = files[newIndex];
      if (file) {
        scrollToElement(`file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`);
      }
    },
    [files, scrollToElement]
  );

  const navigateToLine = useCallback(
    (direction: 'next' | 'prev') => {
      if (allLines.length === 0) return;

      // Filter lines by current side for side-by-side mode
      const filteredLines = allLines.filter((line) => !line.side || line.side === currentSide);

      if (filteredLines.length === 0) return;

      // Find current line index based on ID and side
      let currentIndex =
        currentLineId ?
          filteredLines.findIndex(
            (line) => line.id === currentLineId && (!line.side || line.side === currentSide)
          )
        : -1;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % filteredLines.length;
      } else {
        newIndex =
          currentIndex === -1 ?
            filteredLines.length - 1
          : (currentIndex - 1 + filteredLines.length) % filteredLines.length;
      }

      const newLine = filteredLines[newIndex];
      if (newLine) {
        setCurrentFileIndex(newLine.fileIndex);
        setCurrentHunkIndex(newLine.chunkIndex);
        setCurrentLineId(newLine.id);

        // Check if we need to switch sides (for empty lines in side-by-side mode)
        const file = files[newLine.fileIndex];
        if (newLine.side && file) {
          const chunk = file.chunks[newLine.chunkIndex];
          const line = chunk?.lines[newLine.lineIndex];

          // If current side is empty (e.g., delete line on right side), switch to the other side
          if (
            line &&
            ((currentSide === 'left' && line.type === 'add') ||
              (currentSide === 'right' && line.type === 'delete'))
          ) {
            setCurrentSide(currentSide === 'left' ? 'right' : 'left');
            // Use the other side for scrolling
            const elementId = `${newLine.id}-${currentSide === 'left' ? 'right' : 'left'}`;
            scrollToElement(elementId);
            return;
          }
        }

        // Scroll to the line element with side suffix for side-by-side mode
        const elementId = newLine.side ? `${newLine.id}-${newLine.side}` : newLine.id;
        scrollToElement(elementId);
      }
    },
    [allLines, currentLineId, currentSide, files, scrollToElement]
  );

  // Check if a line is the first line of a change chunk (continuous add/delete lines)
  // Following Gerrit's approach: continuous add/delete lines form a single chunk
  const isFirstLineOfChangeChunk = useCallback(
    (fileIndex: number, chunkIndex: number, lineIndex: number): boolean => {
      // First line in a hunk is always start of chunk if it's a change
      if (lineIndex === 0) {
        const line = files[fileIndex]?.chunks[chunkIndex]?.lines[lineIndex];
        return line?.type !== 'normal';
      }

      // Check if previous line exists and is normal
      const prevLine = files[fileIndex]?.chunks[chunkIndex]?.lines[lineIndex - 1];
      const currentLine = files[fileIndex]?.chunks[chunkIndex]?.lines[lineIndex];

      if (!currentLine || currentLine.type === 'normal') return false;
      if (!prevLine || prevLine.type === 'normal') return true;

      // Continuous add/delete lines are part of same chunk
      return false;
    },
    [files]
  );

  // Navigate to next/previous change chunk across all files (n/p keys)
  const navigateToChunk = useCallback(
    (direction: 'next' | 'prev') => {
      // Collect all chunk start positions across all files
      interface ChunkStart {
        fileIndex: number;
        chunkIndex: number;
        lineIndex: number;
      }

      const allChunks: ChunkStart[] = [];

      files.forEach((file, fileIndex) => {
        file.chunks.forEach((chunk, chunkIndex) => {
          chunk.lines.forEach((_, lineIndex) => {
            if (isFirstLineOfChangeChunk(fileIndex, chunkIndex, lineIndex)) {
              allChunks.push({ fileIndex, chunkIndex, lineIndex });
            }
          });
        });
      });

      if (allChunks.length === 0) return;

      // Find current chunk (the chunk we're in or just passed)
      let currentChunkIdx = -1;
      if (currentLineId) {
        // Parse current position from lineId
        const match = currentLineId.match(/file-(\d+)-chunk-(\d+)-line-(\d+)/);
        if (match) {
          const [, fileStr, chunkStr, lineStr] = match;
          const currentFile = parseInt(fileStr || '0', 10);
          const currentChunk = parseInt(chunkStr || '0', 10);
          const currentLine = parseInt(lineStr || '0', 10);

          // Find which chunk we're in or just after
          for (let i = allChunks.length - 1; i >= 0; i--) {
            const chunk = allChunks[i];
            if (
              chunk &&
              (chunk.fileIndex < currentFile ||
                (chunk.fileIndex === currentFile && chunk.chunkIndex < currentChunk) ||
                (chunk.fileIndex === currentFile &&
                  chunk.chunkIndex === currentChunk &&
                  chunk.lineIndex <= currentLine))
            ) {
              currentChunkIdx = i;
              break;
            }
          }
        }
      }

      // Navigate to target chunk
      let targetChunk: ChunkStart | undefined;
      if (direction === 'next') {
        targetChunk =
          currentChunkIdx >= allChunks.length - 1 ? allChunks[0] : allChunks[currentChunkIdx + 1];
      } else {
        targetChunk =
          currentChunkIdx <= 0 ? allChunks[allChunks.length - 1] : allChunks[currentChunkIdx - 1];
      }

      if (!targetChunk) return;

      // Get the actual line to navigate to
      const line =
        files[targetChunk.fileIndex]?.chunks[targetChunk.chunkIndex]?.lines[targetChunk.lineIndex];
      if (!line) return;

      // Build the line ID
      const targetLineId = `file-${targetChunk.fileIndex}-chunk-${targetChunk.chunkIndex}-line-${targetChunk.lineIndex}`;

      // Determine which side to use in side-by-side mode
      let targetSide = currentSide;
      if (line.type === 'delete') {
        targetSide = 'left';
      } else if (line.type === 'add') {
        targetSide = 'right';
      }
      // For normal lines, keep current side

      // Update state
      setCurrentFileIndex(targetChunk.fileIndex);
      setCurrentHunkIndex(targetChunk.chunkIndex);
      setCurrentLineId(targetLineId);
      setCurrentSide(targetSide);

      // Scroll to element
      const elementId =
        allLines.some((l) => l.side) ? `${targetLineId}-${targetSide}` : targetLineId;
      scrollToElement(elementId);
    },
    [files, currentLineId, currentSide, isFirstLineOfChangeChunk, allLines, scrollToElement]
  );

  // Check if a line has comments
  const lineHasComment = useCallback(
    (line: NavigableLine): boolean => {
      return sortedComments.some((comment) => {
        const file = files[line.fileIndex];
        if (!file || file.path !== comment.file) return false;

        const lineNumber = Array.isArray(comment.line) ? comment.line[0] : comment.line;
        return line.oldLineNumber === lineNumber || line.newLineNumber === lineNumber;
      });
    },
    [sortedComments, files]
  );

  // Navigate to next/previous comment from current cursor position (N/P keys)
  const navigateToComment = useCallback(
    (direction: 'next' | 'prev') => {
      if (sortedComments.length === 0) return;

      // Filter lines by current side for side-by-side mode
      const filteredLines = allLines.filter((line) => !line.side || line.side === currentSide);

      // Filter to only include lines with comments
      const linesWithComments = filteredLines.filter((line) => lineHasComment(line));

      if (linesWithComments.length === 0) return;

      // Find current position
      let currentIndex = -1;
      if (currentLineId) {
        // Find where we are in the sorted list of all lines
        const currentLineIndex = filteredLines.findIndex((line) => line.id === currentLineId);

        if (currentLineIndex >= 0) {
          // Find the nearest line with comment at or before current position
          for (let i = linesWithComments.length - 1; i >= 0; i--) {
            const lineWithComment = linesWithComments[i];
            if (lineWithComment) {
              const lineWithCommentIndex = filteredLines.findIndex(
                (l) => l.id === lineWithComment.id
              );
              if (lineWithCommentIndex <= currentLineIndex) {
                currentIndex = i;
                break;
              }
            }
          }
        }
      }

      let targetLine: NavigableLine | undefined;
      if (direction === 'next') {
        if (currentIndex === -1 || currentIndex >= linesWithComments.length - 1) {
          // No current position or at last comment, go to first comment
          targetLine = linesWithComments[0];
        } else {
          // Go to next comment
          targetLine = linesWithComments[currentIndex + 1];
        }
      } else {
        if (currentIndex <= 0) {
          // No current position or at first comment, go to last comment
          targetLine = linesWithComments[linesWithComments.length - 1];
        } else {
          // Go to previous comment
          targetLine = linesWithComments[currentIndex - 1];
        }
      }

      if (targetLine) {
        setCurrentFileIndex(targetLine.fileIndex);
        setCurrentHunkIndex(targetLine.chunkIndex);

        // In side-by-side mode, switch to the side where the comment exists
        if (targetLine.side) {
          if (targetLine.type === 'delete') {
            setCurrentSide('left');
          } else if (targetLine.type === 'add') {
            setCurrentSide('right');
          }
          // For normal lines, keep current side
        }

        setCurrentLineId(targetLine.id);
        const elementId = targetLine.side ? `${targetLine.id}-${targetLine.side}` : targetLine.id;
        scrollToElement(elementId);

        // Find the associated comment and update index
        const file = files[targetLine.fileIndex];
        if (file) {
          const lineNumber = targetLine.oldLineNumber || targetLine.newLineNumber;
          const commentIndex = sortedComments.findIndex(
            (comment) =>
              comment.file === file.path &&
              (Array.isArray(comment.line) ? comment.line[0] : comment.line) === lineNumber
          );
          if (commentIndex >= 0) {
            setCurrentCommentIndex(commentIndex);

            // Also scroll to the comment itself after a short delay
            setTimeout(() => {
              const comment = sortedComments[commentIndex];
              if (comment) {
                scrollToElement(`comment-${comment.id}`);
              }
            }, 100);
          }
        }
      }
    },
    [allLines, currentLineId, currentSide, lineHasComment, sortedComments, files, scrollToElement]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Handle shortcuts
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
        case ']':
          event.preventDefault();
          navigateToFile(currentFileIndex + 1);
          break;
        case '[':
          event.preventDefault();
          navigateToFile(currentFileIndex - 1);
          break;
        case 'h':
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentSide('left');
          // Re-scroll to update highlighting
          if (currentLineId) {
            scrollToElement(`${currentLineId}-left`);
          }
          break;
        case 'l':
        case 'ArrowRight':
          event.preventDefault();
          setCurrentSide('right');
          // Re-scroll to update highlighting
          if (currentLineId) {
            scrollToElement(`${currentLineId}-right`);
          }
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
        case 'r':
          event.preventDefault();
          if (currentFileIndex >= 0 && files[currentFileIndex]) {
            onToggleReviewed(files[currentFileIndex].path);
          }
          break;
        case 'c':
          event.preventDefault();
          // Add comment at current line
          if (currentLineId) {
            const currentLine = allLines.find((line) => line.id === currentLineId);
            if (currentLine) {
              const file = files[currentLine.fileIndex];
              if (file) {
                // TODO: Trigger comment form at the current line
              }
            }
          }
          break;
        case '?':
          event.preventDefault();
          setIsHelpOpen(!isHelpOpen);
          break;
      }
    },
    [
      currentFileIndex,
      currentLineId,
      allLines,
      navigateToFile,
      navigateToLine,
      navigateToChunk,
      navigateToComment,
      files,
      onToggleReviewed,
      isHelpOpen,
      scrollToElement,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    currentFileIndex,
    currentHunkIndex,
    currentLineId,
    currentSide,
    currentCommentIndex,
    isHelpOpen,
    setCurrentFileIndex,
    setCurrentHunkIndex,
    setCurrentLineId,
    setCurrentSide,
    setCurrentCommentIndex,
    setIsHelpOpen,
  };
}
