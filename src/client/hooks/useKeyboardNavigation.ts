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
  currentCommentIndex: number;
  isHelpOpen: boolean;
  setCurrentFileIndex: (index: number) => void;
  setCurrentHunkIndex: (index: number) => void;
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

      const file = files[newIndex];
      if (file) {
        scrollToElement(`file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`);
      }
    },
    [files, scrollToElement]
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

        const file = files[newHunk.fileIndex];
        if (file) {
          scrollToElement(`chunk-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}-${newHunk.hunkIndex}`);
        }
      }
    },
    [allHunks, currentFileIndex, currentHunkIndex, files, scrollToElement]
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
          navigateToFile(currentFileIndex + 1);
          break;
        case 'k':
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
          // Comment functionality will be added later
          // For now, just prevent default
          event.preventDefault();
          break;
        case '?':
          event.preventDefault();
          setIsHelpOpen(!isHelpOpen);
          break;
      }
    },
    [
      currentFileIndex,
      navigateToFile,
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
    currentCommentIndex,
    isHelpOpen,
    setCurrentFileIndex,
    setCurrentHunkIndex,
    setCurrentCommentIndex,
    setIsHelpOpen,
  };
}
