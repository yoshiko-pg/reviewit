import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { DiffFile } from '../../types/diff';

import { useKeyboardNavigation } from './useKeyboardNavigation';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('useKeyboardNavigation', () => {
  const mockFiles: DiffFile[] = [
    {
      path: 'file1.ts',
      oldPath: 'file1.ts',
      status: 'modified',
      chunks: [
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 3,
          header: '@@ -1,3 +1,3 @@',
          lines: [
            { type: 'delete', content: '-old line', oldLineNumber: 1 },
            { type: 'add', content: '+new line', newLineNumber: 1 },
            { type: 'normal', content: ' context', oldLineNumber: 2, newLineNumber: 2 },
          ],
        },
        {
          oldStart: 10,
          oldLines: 5,
          newStart: 10,
          newLines: 5,
          header: '@@ -10,5 +10,5 @@',
          lines: [
            { type: 'add', content: '+added line', newLineNumber: 10 },
            { type: 'delete', content: '-removed line', oldLineNumber: 11 },
          ],
        },
      ],
      additions: 5,
      deletions: 3,
    },
    {
      path: 'file2.ts',
      oldPath: 'file2.ts',
      status: 'modified',
      chunks: [
        {
          oldStart: 20,
          oldLines: 2,
          newStart: 20,
          newLines: 2,
          header: '@@ -20,2 +20,2 @@',
          lines: [{ type: 'add', content: '+new content', newLineNumber: 20 }],
        },
      ],
      additions: 2,
      deletions: 1,
    },
  ];

  const mockComments = [
    { id: '1', file: 'file1.ts', line: 5, body: 'Comment 1', timestamp: new Date().toISOString() },
    { id: '2', file: 'file2.ts', line: 22, body: 'Comment 2', timestamp: new Date().toISOString() },
  ];

  const mockToggleReviewed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Line Navigation (j/k)', () => {
    it('should navigate to next line with j key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      expect(result.current.currentLineId).toBe(null);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // Should navigate to the first navigable line on the right side (add line at index 1)
      expect(result.current.currentLineId).toBe('file-0-chunk-0-line-1');
    });

    it('should navigate to previous line with k key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate to second line first
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // With right side filtering, we should be at the normal line (index 2)
      expect(result.current.currentLineId).toBe('file-0-chunk-0-line-2');

      // Navigate back with k
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k' });
        window.dispatchEvent(event);
      });

      // Should go back to the add line (index 1)
      expect(result.current.currentLineId).toBe('file-0-chunk-0-line-1');
    });
  });

  describe('File Navigation (]/[)', () => {
    it('should navigate to next file with ] key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      expect(result.current.currentFileIndex).toBe(-1);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(0);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(1);
    });

    it('should navigate to previous file with [ key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Set initial position
      act(() => {
        result.current.setCurrentFileIndex(1);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '[' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(0);
    });

    it('should wrap around when navigating past boundaries', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate past last file
      act(() => {
        result.current.setCurrentFileIndex(1);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(0); // Should wrap to first file

      // Navigate before first file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '[' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(1); // Should wrap to last file
    });
  });

  describe('Hunk Navigation (n/p)', () => {
    it('should navigate to next hunk with n key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      expect(result.current.currentHunkIndex).toBe(-1);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentHunkIndex).toBe(0);
      expect(result.current.currentFileIndex).toBe(0);

      // Navigate to next hunk in same file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentHunkIndex).toBe(1);
      expect(result.current.currentFileIndex).toBe(0);

      // Navigate to hunk in next file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentHunkIndex).toBe(0);
      expect(result.current.currentFileIndex).toBe(1);
    });

    it('should navigate to previous hunk with p key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Start at last hunk
      act(() => {
        result.current.setCurrentFileIndex(1);
        result.current.setCurrentHunkIndex(0);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'p' });
        window.dispatchEvent(event);
      });

      expect(result.current.currentHunkIndex).toBe(1);
      expect(result.current.currentFileIndex).toBe(0);
    });
  });

  describe('Comment Navigation (N/P)', () => {
    it('should navigate to next comment with N key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.currentCommentIndex).toBe(0);
      expect(result.current.currentFileIndex).toBe(0); // Should jump to file with first comment

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.currentCommentIndex).toBe(1);
      expect(result.current.currentFileIndex).toBe(1); // Should jump to file with second comment
    });

    it('should navigate to previous comment with P key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Start at second comment
      act(() => {
        result.current.setCurrentCommentIndex(1);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'P', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.currentCommentIndex).toBe(0);
    });
  });

  describe('Review Toggle (r)', () => {
    it('should toggle reviewed state with r key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate to first file
      act(() => {
        result.current.setCurrentFileIndex(0);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'r' });
        window.dispatchEvent(event);
      });

      expect(mockToggleReviewed).toHaveBeenCalledWith('file1.ts');
    });

    it('should not toggle reviewed state when no file is selected', () => {
      renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'r' });
        window.dispatchEvent(event);
      });

      expect(mockToggleReviewed).not.toHaveBeenCalled();
    });
  });

  describe('Add Comment (c)', () => {
    it('should prevent default for c key (comment functionality to be added)', () => {
      renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      const event = new KeyboardEvent('keydown', { key: 'c', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Help Modal (?)', () => {
    it('should toggle help modal with ? key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      expect(result.current.isHelpOpen).toBe(false);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '?' });
        window.dispatchEvent(event);
      });

      expect(result.current.isHelpOpen).toBe(true);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '?' });
        window.dispatchEvent(event);
      });

      expect(result.current.isHelpOpen).toBe(false);
    });
  });

  describe('Input Field Handling', () => {
    it('should not handle shortcuts when typing in input fields', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        input.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(-1); // Should not change

      document.body.removeChild(input);
    });

    it('should not handle shortcuts when typing in textarea', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        textarea.dispatchEvent(event);
      });

      expect(result.current.currentFileIndex).toBe(-1); // Should not change

      document.body.removeChild(textarea);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});
