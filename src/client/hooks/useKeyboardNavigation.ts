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

  // Create a flat list of all hunks with their file indices
  const allHunks = useMemo(() => {
    const hunks: Array<{ fileIndex: number; hunkIndex: number; element?: HTMLElement }> = [];
    files.forEach((file, fileIndex) => {
      file.chunks.forEach((_, hunkIndex) => {
        hunks.push({ fileIndex, hunkIndex });
      });
    });
    return hunks;
  }, [files]);

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

  const navigateToHunk = useCallback(
    (direction: 'next' | 'prev') => {
      if (allHunks.length === 0) return;

      let currentGlobalIndex = -1;
      if (currentFileIndex >= 0 && currentHunkIndex >= 0) {
        currentGlobalIndex = allHunks.findIndex(
          (h) => h.fileIndex === currentFileIndex && h.hunkIndex === currentHunkIndex
        );
      }

      let newGlobalIndex: number;
      if (direction === 'next') {
        newGlobalIndex = (currentGlobalIndex + 1) % allHunks.length;
      } else {
        newGlobalIndex =
          currentGlobalIndex === -1 ?
            allHunks.length - 1
          : (currentGlobalIndex - 1 + allHunks.length) % allHunks.length;
      }

      const newHunk = allHunks[newGlobalIndex];
      if (newHunk) {
        setCurrentFileIndex(newHunk.fileIndex);
        setCurrentHunkIndex(newHunk.hunkIndex);

        // Find the first changed line in this hunk
        const firstLineInHunk = allLines.find(
          (line) => line.fileIndex === newHunk.fileIndex && line.chunkIndex === newHunk.hunkIndex
        );

        if (firstLineInHunk) {
          setCurrentLineId(firstLineInHunk.id);
          scrollToElement(firstLineInHunk.id);
        } else {
          setCurrentLineId(null);
          const file = files[newHunk.fileIndex];
          if (file) {
            scrollToElement(
              `chunk-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}-${newHunk.hunkIndex}`
            );
          }
        }
      }
    },
    [allHunks, allLines, currentFileIndex, currentHunkIndex, files, scrollToElement]
  );

  const navigateToComment = useCallback(
    (direction: 'next' | 'prev') => {
      if (sortedComments.length === 0) return;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = (currentCommentIndex + 1) % sortedComments.length;
      } else {
        newIndex =
          currentCommentIndex === -1 ?
            sortedComments.length - 1
          : (currentCommentIndex - 1 + sortedComments.length) % sortedComments.length;
      }

      setCurrentCommentIndex(newIndex);

      const comment = sortedComments[newIndex];
      if (comment) {
        const fileIndex = files.findIndex((f) => f.path === comment.file);
        if (fileIndex >= 0) {
          setCurrentFileIndex(fileIndex);
        }

        scrollToElement(`comment-${comment.id}`);
      }
    },
    [sortedComments, currentCommentIndex, files, scrollToElement]
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
          navigateToHunk('next');
          break;
        case 'p':
          event.preventDefault();
          navigateToHunk('prev');
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
      navigateToHunk,
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
