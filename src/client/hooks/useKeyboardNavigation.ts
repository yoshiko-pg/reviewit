import { useState, useEffect, useCallback, useMemo } from 'react';

import type { DiffFile, Comment } from '../../types/diff';

interface UseKeyboardNavigationProps {
  files: DiffFile[];
  comments: Comment[];
  onToggleReviewed: (filePath: string) => void;
}

interface UseKeyboardNavigationReturn {
  currentFileIndex: number;
  currentHunkIndex: number;
  currentLineIndex: number;
  currentCommentIndex: number;
  isHelpOpen: boolean;
  setCurrentFileIndex: (index: number) => void;
  setCurrentHunkIndex: (index: number) => void;
  setCurrentLineIndex: (index: number) => void;
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
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
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

  // Create a flat list of all changed lines (additions and deletions)
  const allLines = useMemo(() => {
    const lines: Array<{
      fileIndex: number;
      hunkIndex: number;
      lineIndex: number;
      type: 'add' | 'delete';
      lineNumber: number;
    }> = [];

    files.forEach((file, fileIndex) => {
      file.chunks.forEach((chunk, hunkIndex) => {
        chunk.lines.forEach((line, lineIndex) => {
          if (line.type === 'add' || line.type === 'delete') {
            lines.push({
              fileIndex,
              hunkIndex,
              lineIndex,
              type: line.type,
              lineNumber:
                line.type === 'add' ? (line.newLineNumber ?? 0) : (line.oldLineNumber ?? 0),
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
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const navigateToFile = useCallback(
    (index: number) => {
      if (files.length === 0) return;

      const newIndex = ((index % files.length) + files.length) % files.length;
      setCurrentFileIndex(newIndex);
      setCurrentHunkIndex(-1);
      setCurrentLineIndex(-1);

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

      let currentGlobalIndex = -1;
      if (currentLineIndex >= 0) {
        currentGlobalIndex = currentLineIndex;
      }

      let newGlobalIndex: number;
      if (direction === 'next') {
        newGlobalIndex = (currentGlobalIndex + 1) % allLines.length;
      } else {
        newGlobalIndex =
          currentGlobalIndex === -1 ?
            allLines.length - 1
          : (currentGlobalIndex - 1 + allLines.length) % allLines.length;
      }

      const newLine = allLines[newGlobalIndex];
      if (newLine) {
        setCurrentFileIndex(newLine.fileIndex);
        setCurrentHunkIndex(newLine.hunkIndex);
        setCurrentLineIndex(newGlobalIndex);

        const file = files[newLine.fileIndex];
        if (file) {
          const lineId = `line-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}-${newLine.hunkIndex}-${newLine.lineIndex}`;
          scrollToElement(lineId);
        }
      }
    },
    [allLines, currentLineIndex, files, scrollToElement]
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
        const firstLineInHunk = allLines.findIndex(
          (line) => line.fileIndex === newHunk.fileIndex && line.hunkIndex === newHunk.hunkIndex
        );
        setCurrentLineIndex(firstLineInHunk >= 0 ? firstLineInHunk : -1);

        const file = files[newHunk.fileIndex];
        if (file && firstLineInHunk >= 0) {
          const line = allLines[firstLineInHunk];
          const lineId = `line-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}-${line?.hunkIndex ?? 0}-${line?.lineIndex ?? 0}`;
          scrollToElement(lineId);
        } else if (file) {
          scrollToElement(`chunk-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}-${newHunk.hunkIndex}`);
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
          event.preventDefault();
          navigateToLine('next');
          break;
        case 'k':
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
          if (currentLineIndex >= 0 && allLines[currentLineIndex]) {
            const currentLine = allLines[currentLineIndex];
            const file = files[currentLine.fileIndex];
            if (file) {
              // TODO: Trigger comment form at the current line
              console.log('Add comment at line:', currentLine);
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
      currentLineIndex,
      allLines,
      navigateToFile,
      navigateToLine,
      navigateToHunk,
      navigateToComment,
      files,
      onToggleReviewed,
      isHelpOpen,
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
    currentLineIndex,
    currentCommentIndex,
    isHelpOpen,
    setCurrentFileIndex,
    setCurrentHunkIndex,
    setCurrentLineIndex,
    setCurrentCommentIndex,
    setIsHelpOpen,
  };
}
