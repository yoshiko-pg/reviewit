import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { DiffFile } from '../../types/diff';

import { useKeyboardNavigation } from './useKeyboardNavigation';

// Mock scrollIntoView and getElementById
Element.prototype.scrollIntoView = vi.fn();
const mockGetElementById = vi.spyOn(document, 'getElementById');

// Mock querySelector for the scrollable container
const mockQuerySelector = vi.spyOn(document, 'querySelector');

// Mock window properties
Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

Object.defineProperty(window, 'pageYOffset', {
  writable: true,
  configurable: true,
  value: 0,
});

window.scrollTo = vi.fn();

// Helper to create mock elements
const createMockElement = () => ({
  scrollIntoView: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    top: 100,
    bottom: 200,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
  })),
  offsetTop: 150,
});

// Helper to create mock scrollable container
const createMockScrollContainer = () => ({
  getBoundingClientRect: vi.fn(() => ({
    top: 0,
    bottom: 768,
    left: 0,
    right: 1024,
    width: 1024,
    height: 768,
  })),
  clientHeight: 768,
  scrollTop: 0,
  offsetTop: 0,
});

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
    { id: '1', file: 'file1.ts', line: 1, body: 'Comment 1', timestamp: new Date().toISOString() }, // On the add line
    { id: '2', file: 'file2.ts', line: 20, body: 'Comment 2', timestamp: new Date().toISOString() }, // On the add line in file2
  ];

  const mockToggleReviewed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getElementById to return a mock element
    mockGetElementById.mockImplementation((id) => {
      if (id) {
        const element = createMockElement();
        return element as any;
      }
      return null;
    });
    // Mock querySelector to return a mock scrollable container
    mockQuerySelector.mockImplementation((selector) => {
      if (selector === 'main.overflow-y-auto') {
        const container = createMockScrollContainer();
        return container as any;
      }
      return null;
    });
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

      expect(result.current.cursor).toBe(null);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // In inline mode, should navigate to the first line (delete line at index 0)
      // The side will be fixed to 'left' since delete lines only have content on the left
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });
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

      // In inline mode, we should be at line 1 (add line)
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });

      // Navigate back with k
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k' });
        window.dispatchEvent(event);
      });

      // Should go back to line 0 (delete line)
      // The side will be fixed to 'left' since delete lines only have content on the left
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });
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

      expect(result.current.cursor).toBe(null);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });

      // After navigating to file, cursor should be set to the first line of the file
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left', // Fixed to left because first line is a delete line
      });
      // The getElementById should be called to find the first line element
      expect(mockGetElementById).toHaveBeenCalledWith('file-0-chunk-0-line-0');
    });

    it('should navigate to previous file with [ key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // First navigate to a position in file 1
      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '[' });
        window.dispatchEvent(event);
      });

      // Cursor should be set to the first line of file0
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left', // Fixed to left because first line is a delete line
      });
    });

    it('should wrap around when navigating past boundaries', () => {
      renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate past last file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']' });
        window.dispatchEvent(event);
      });

      // Should wrap to first file
      expect(mockGetElementById).toHaveBeenCalled();

      // Navigate before first file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '[' });
        window.dispatchEvent(event);
      });

      // Should wrap to last file
      expect(mockGetElementById).toHaveBeenCalled();
    });
  });

  describe('Chunk Navigation (n/p)', () => {
    it('should navigate to next chunk with n key (continuous add/delete treated as single chunk)', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      expect(result.current.cursor).toBe(null);

      // First press - should go to first change chunk (on right side: add line at index 1)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      // First chunk is the delete/add pair at hunk 0, starting with delete line
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });

      // Navigate to next chunk (add/delete pair in hunk 1)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 1,
        lineIndex: 0,
        side: 'right',
      });

      // Navigate to next chunk (add line in file2)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 1,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'right',
      });

      // Navigate to next chunk (wraps back to first chunk)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });
    });

    it('should navigate to previous chunk with p key (continuous add/delete treated as single chunk)', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // First navigate to file2 (3 n key presses: chunk0->chunk1->file2)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        window.dispatchEvent(event);
      });

      // Now we should be at file 1, chunk 0 (add line)
      expect(result.current.cursor).toEqual({
        fileIndex: 1,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'right',
      });

      // Navigate back to previous chunk (second chunk of file0)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'p' });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 1,
        lineIndex: 0,
        side: 'right',
      });

      // Navigate back to previous chunk (first chunk of file0)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'p' });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });

      // Navigate back to previous chunk (wraps to last chunk)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'p' });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 1,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'right',
      });
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

      // First comment is on line 1 in file1.ts
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });

      // The comment navigation should find the delete line (index 0) since it has oldLineNumber: 1
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });

      // Next N will find the add line with newLineNumber: 1 in the same file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });

      // Third N will find the comment on line 20 in file2.ts
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 1,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'right',
      });
    });

    it('should navigate to previous comment with P key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate to third comment position (file2) first
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'N', shiftKey: true });
        window.dispatchEvent(event);
      });

      // Now navigate back - should go to the add line in file1
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'P', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });

      // Navigate back again - should go to the delete line in file1
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'P', shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });
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

      // Navigate to a line in the first file
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // Verify we have a cursor position
      expect(result.current.cursor).not.toBe(null);

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

  describe('Side Switching (h/l)', () => {
    it('should find nearest line with content when switching sides', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          viewMode: 'side-by-side',
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate to first line - in side-by-side mode, it skips to first line with content on right side
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // Should skip delete line (no content on right) and go to add line
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });

      // Try to switch to left side with 'h' - should go to paired delete line
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' });
        window.dispatchEvent(event);
      });

      // Should move to the paired delete line (index 0)
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });

      // We're already on the delete line, so no need to navigate back

      // Switch to right side with 'l' - should go to paired add line
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'l' });
        window.dispatchEvent(event);
      });

      // Should move to the paired add line (index 1)
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });

      // Navigate to normal line
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // Should be on normal line
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 2,
        side: 'right',
      });

      // Switch to left side with 'h' - should stay on same line since normal lines have content on both sides
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' });
        window.dispatchEvent(event);
      });

      // Should stay on same line but switch side
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 2,
        side: 'left',
      });
    });

    it('should handle delete/add pairs correctly when switching sides', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({
          files: mockFiles,
          comments: mockComments,
          viewMode: 'side-by-side',
          onToggleReviewed: mockToggleReviewed,
        })
      );

      // Navigate to the add line (which pairs with the delete line above it)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        window.dispatchEvent(event);
      });

      // Should be on add line (index 1)
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });

      // Switch to left side - should go to the paired delete line (index 0)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' });
        window.dispatchEvent(event);
      });

      // Should be on the delete line that pairs with the add line
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 0,
        side: 'left',
      });

      // Switch back to right side - should go to the paired add line (index 1)
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'l' });
        window.dispatchEvent(event);
      });

      // Should be back on the add line
      expect(result.current.cursor).toEqual({
        fileIndex: 0,
        chunkIndex: 0,
        lineIndex: 1,
        side: 'right',
      });
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

      expect(result.current.cursor).toBe(null); // Should not change

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

      expect(result.current.cursor).toBe(null); // Should not change

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
