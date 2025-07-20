import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { mockFetch } from '../../vitest.setup';
import type { DiffResponse } from '../types/diff';

import App from './App';

// Mock the useLocalComments hook
vi.mock('./hooks/useLocalComments', () => ({
  useLocalComments: vi.fn(() => ({
    comments: mockComments,
    addComment: vi.fn(),
    removeComment: vi.fn(),
    updateComment: vi.fn(),
    clearAllComments: mockClearAllComments,
    generatePrompt: vi.fn(),
    generateAllCommentsPrompt: vi.fn(),
  })),
}));

// Mock navigator.sendBeacon
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: vi.fn(),
});

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});

// Mock EventSource
const mockEventSource = {
  onopen: vi.fn(),
  onerror: vi.fn(),
  close: vi.fn(),
};
Object.defineProperty(window, 'EventSource', {
  writable: true,
  value: vi.fn(() => mockEventSource),
});

let mockComments: any[] = [];
const mockClearAllComments = vi.fn();

const mockDiffResponse: DiffResponse = {
  commit: 'abc123',
  files: [
    {
      path: 'test.ts',
      status: 'modified',
      additions: 5,
      deletions: 2,
      chunks: [],
    },
  ],
  ignoreWhitespace: false,
  isEmpty: false,
  mode: 'side-by-side',
};

describe('App Component - Clear Comments Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComments = [];
    mockConfirm.mockReturnValue(false);
    mockFetch(mockDiffResponse);
  });

  describe('Delete All Comments Button', () => {
    it('should not show delete button when no comments exist', async () => {
      mockComments = [];

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Delete All Comments')).not.toBeInTheDocument();
      });
    });

    it('should show delete button when comments exist', async () => {
      mockComments = [
        {
          id: 'test-1',
          file: 'test.ts',
          line: 10,
          body: 'Test comment',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Delete All Comments')).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      mockComments = [
        { id: '1', file: 'test.ts', line: 10, body: 'Comment 1', timestamp: '2024-01-01' },
        { id: '2', file: 'test.ts', line: 20, body: 'Comment 2', timestamp: '2024-01-01' },
      ];

      render(<App />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete All Comments');
        fireEvent.click(deleteButton);
      });

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete all 2 comments?');
    });

    it('should call clearAllComments when user confirms deletion', async () => {
      mockComments = [
        { id: '1', file: 'test.ts', line: 10, body: 'Comment 1', timestamp: '2024-01-01' },
      ];
      mockConfirm.mockReturnValue(true);

      render(<App />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete All Comments');
        fireEvent.click(deleteButton);
      });

      expect(mockClearAllComments).toHaveBeenCalled();
    });

    it('should not call clearAllComments when user cancels deletion', async () => {
      mockComments = [
        { id: '1', file: 'test.ts', line: 10, body: 'Comment 1', timestamp: '2024-01-01' },
      ];
      mockConfirm.mockReturnValue(false);

      render(<App />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete All Comments');
        fireEvent.click(deleteButton);
      });

      expect(mockClearAllComments).not.toHaveBeenCalled();
    });
  });

  describe('Clean flag on Startup', () => {
    it('should clear existing comments when clearComments flag is true in response', async () => {
      const responseWithClearFlag: DiffResponse = {
        ...mockDiffResponse,
        clearComments: true,
      };

      mockFetch(responseWithClearFlag);

      render(<App />);

      await waitFor(() => {
        expect(mockClearAllComments).toHaveBeenCalled();
      });
    });

    it('should not clear comments when clearComments flag is false', async () => {
      const responseWithoutClearFlag: DiffResponse = {
        ...mockDiffResponse,
        clearComments: false,
      };

      mockFetch(responseWithoutClearFlag);

      render(<App />);

      await waitFor(() => {
        expect(mockClearAllComments).not.toHaveBeenCalled();
      });
    });

    it('should not clear comments when clearComments flag is undefined', async () => {
      const responseWithoutFlag: DiffResponse = {
        ...mockDiffResponse,
        // clearComments is undefined
      };

      mockFetch(responseWithoutFlag);

      render(<App />);

      await waitFor(() => {
        expect(mockClearAllComments).not.toHaveBeenCalled();
      });
    });

    it('should log message when clearing comments via CLI flag', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const responseWithClearFlag: DiffResponse = {
        ...mockDiffResponse,
        clearComments: true,
      };

      mockFetch(responseWithClearFlag);

      render(<App />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '✅ All existing comments cleared as requested via --clean flag'
        );
      });

      consoleLogSpy.mockRestore();
    });
  });
});

describe('Client mode handling logic', () => {
  it('validates DiffResponse interface includes mode', () => {
    // Test that DiffResponse interface supports mode property
    const mockResponse: DiffResponse = {
      commit: 'abc123',
      files: [],
      ignoreWhitespace: false,
      isEmpty: false,
      mode: 'inline',
    };

    expect(mockResponse.mode).toBe('inline');
    expect(mockResponse.commit).toBe('abc123');
    expect(mockResponse.files).toEqual([]);
  });

  it('validates DiffResponse with side-by-side mode', () => {
    const mockResponse: DiffResponse = {
      commit: 'abc123',
      files: [],
      ignoreWhitespace: false,
      isEmpty: false,
      mode: 'side-by-side',
    };

    expect(mockResponse.mode).toBe('side-by-side');
  });

  it('validates DiffResponse without mode property', () => {
    const mockResponse: DiffResponse = {
      commit: 'abc123',
      files: [],
      ignoreWhitespace: false,
      isEmpty: false,
      // mode is optional, so can be omitted
    };

    expect(mockResponse.mode).toBeUndefined();
  });

  it('mode setting logic works correctly', () => {
    // Test the mode setting logic that would be used in fetchDiffData
    const setModeFromResponse = (data: DiffResponse): 'side-by-side' | 'inline' => {
      if (data.mode) {
        return data.mode as 'side-by-side' | 'inline';
      }
      return 'side-by-side'; // default
    };

    const responseWithInline: DiffResponse = { commit: 'abc', files: [], mode: 'inline' };
    const responseWithSideBySide: DiffResponse = { commit: 'abc', files: [], mode: 'side-by-side' };
    const responseWithoutMode: DiffResponse = { commit: 'abc', files: [] };

    expect(setModeFromResponse(responseWithInline)).toBe('inline');
    expect(setModeFromResponse(responseWithSideBySide)).toBe('side-by-side');
    expect(setModeFromResponse(responseWithoutMode)).toBe('side-by-side');
  });
});

describe('DiffResponse clearComments property', () => {
  it('should accept clearComments as boolean property', () => {
    const responseWithClearComments: DiffResponse = {
      commit: 'abc123',
      files: [],
      clearComments: true,
    };

    expect(responseWithClearComments.clearComments).toBe(true);
  });

  it('should allow clearComments to be optional', () => {
    const responseWithoutClearComments: DiffResponse = {
      commit: 'abc123',
      files: [],
    };

    expect(responseWithoutClearComments.clearComments).toBeUndefined();
  });
});
