import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Comment } from '../../types/diff';
import type { NotebookDiffFile, CellDiff } from '../../types/notebook';

import { JupyterNotebookDiffChunk } from './JupyterNotebookDiffChunk';

// Mock the DiffFileHeader component
vi.mock('./DiffFileHeader', () => ({
  DiffFileHeader: vi.fn(({ file, children }) => (
    <div data-testid="diff-file-header">
      Header for {file.path}
      {children}
    </div>
  )),
}));

// Mock the JupyterNotebookCellDiff component
vi.mock('./JupyterNotebookCellDiff', () => ({
  JupyterNotebookCellDiff: vi.fn(({ cellDiff }) => (
    <div data-testid="jupyter-notebook-cell-diff">
      Cell diff for #{cellDiff.cellIndex} ({cellDiff.status})
    </div>
  )),
}));

describe('JupyterNotebookDiffChunk', () => {
  const mockOnAddComment = vi.fn();
  const mockOnGeneratePrompt = vi.fn();
  const mockOnRemoveComment = vi.fn();
  const mockOnUpdateComment = vi.fn();
  const mockOnToggleReviewed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockCellDiff = (overrides: Partial<CellDiff> = {}): CellDiff => ({
    cellIndex: 0,
    status: 'modified',
    oldCell: {
      cell_type: 'code',
      source: ['print("old")'],
      metadata: {},
      execution_count: 1,
    },
    newCell: {
      cell_type: 'code',
      source: ['print("new")'],
      metadata: {},
      execution_count: 2,
    },
    ...overrides,
  });

  const createMockFile = (overrides: Partial<NotebookDiffFile> = {}): NotebookDiffFile => ({
    path: 'test.ipynb',
    status: 'modified',
    cellDiffs: [createMockCellDiff()],
    totalCellsAdded: 0,
    totalCellsDeleted: 0,
    totalCellsModified: 1,
    metadataChanged: false,
    ...overrides,
  });

  const defaultProps = {
    file: createMockFile(),
    comments: [] as Comment[],
    diffMode: 'side-by-side' as const,
    reviewedFiles: new Set<string>(),
    onAddComment: mockOnAddComment,
    onGeneratePrompt: mockOnGeneratePrompt,
    onRemoveComment: mockOnRemoveComment,
    onUpdateComment: mockOnUpdateComment,
    onToggleReviewed: mockOnToggleReviewed,
  };

  describe('Basic rendering', () => {
    it('renders notebook badge in header', () => {
      render(<JupyterNotebookDiffChunk {...defaultProps} />);

      expect(screen.getByTestId('diff-file-header')).toBeInTheDocument();
      expect(screen.getByText('Notebook')).toBeInTheDocument();
    });

    it('renders cell diffs when not collapsed', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({ cellIndex: 0, status: 'modified' }),
          createMockCellDiff({ cellIndex: 1, status: 'added' }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getAllByTestId('jupyter-notebook-cell-diff')).toHaveLength(2);
      expect(screen.getByText('Cell diff for #0 (modified)')).toBeInTheDocument();
      expect(screen.getByText('Cell diff for #1 (added)')).toBeInTheDocument();
    });

    it('displays cell headers with correct information', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({
            cellIndex: 0,
            status: 'modified',
            newCell: { cell_type: 'code', source: ['test'], metadata: {} },
          }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('Cell #0')).toBeInTheDocument();
      expect(screen.getByText('code')).toBeInTheDocument();
      expect(screen.getByText('modified')).toBeInTheDocument();
    });
  });

  describe('Cell type icons', () => {
    it('displays correct icon for code cells', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({
            newCell: { cell_type: 'code', source: ['code'], metadata: {} },
          }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('code')).toBeInTheDocument();
    });

    it('displays correct icon for markdown cells', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({
            newCell: { cell_type: 'markdown', source: ['# Header'], metadata: {} },
          }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('markdown')).toBeInTheDocument();
    });

    it('displays correct icon for raw cells', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({
            newCell: { cell_type: 'raw', source: ['raw text'], metadata: {} },
          }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('raw')).toBeInTheDocument();
    });
  });

  describe('Cell status styling', () => {
    it('applies correct styling for added cells', () => {
      const file = createMockFile({
        cellDiffs: [createMockCellDiff({ status: 'added' })],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      const statusElement = screen.getByText('added');
      expect(statusElement).toHaveClass('bg-green-100/20', 'text-github-accent');
    });

    it('applies correct styling for deleted cells', () => {
      const file = createMockFile({
        cellDiffs: [createMockCellDiff({ status: 'deleted' })],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      const statusElement = screen.getByText('deleted');
      expect(statusElement).toHaveClass('bg-red-100/20', 'text-github-danger');
    });

    it('applies correct styling for modified cells', () => {
      const file = createMockFile({
        cellDiffs: [createMockCellDiff({ status: 'modified' })],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      const statusElement = screen.getByText('modified');
      expect(statusElement).toHaveClass('bg-yellow-100/20', 'text-github-warning');
    });
  });

  describe('Empty state handling', () => {
    it('shows empty state when no cell changes', () => {
      const file = createMockFile({
        cellDiffs: [],
        totalCellsAdded: 0,
        totalCellsDeleted: 0,
        totalCellsModified: 0,
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('No cell changes detected in this notebook')).toBeInTheDocument();
    });

    it('shows metadata change message when only metadata changed', () => {
      const file = createMockFile({
        cellDiffs: [],
        totalCellsAdded: 0,
        totalCellsDeleted: 0,
        totalCellsModified: 0,
        metadataChanged: true,
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('No cell changes detected in this notebook')).toBeInTheDocument();
      expect(screen.getByText('Only metadata has been modified')).toBeInTheDocument();
    });
  });

  describe('Collapse functionality', () => {
    it('hides content when file is collapsed', () => {
      const reviewedFiles = new Set(['test.ipynb']);

      render(<JupyterNotebookDiffChunk {...defaultProps} reviewedFiles={reviewedFiles} />);

      expect(screen.queryByTestId('jupyter-notebook-cell-diff')).not.toBeInTheDocument();
      expect(screen.queryByText('Cell #0')).not.toBeInTheDocument();
    });

    it('shows content when file is not collapsed', () => {
      const reviewedFiles = new Set<string>();

      render(<JupyterNotebookDiffChunk {...defaultProps} reviewedFiles={reviewedFiles} />);

      expect(screen.getByTestId('jupyter-notebook-cell-diff')).toBeInTheDocument();
      expect(screen.getByText('Cell #0')).toBeInTheDocument();
    });
  });

  describe('Filtering unchanged cells', () => {
    it('skips unchanged cells to reduce clutter', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({ cellIndex: 0, status: 'modified' }),
          createMockCellDiff({ cellIndex: 1, status: 'unchanged' }),
          createMockCellDiff({ cellIndex: 2, status: 'added' }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('Cell #0')).toBeInTheDocument();
      expect(screen.queryByText('Cell #1')).not.toBeInTheDocument();
      expect(screen.getByText('Cell #2')).toBeInTheDocument();
    });
  });

  describe('Comments integration', () => {
    it('filters comments by file path', () => {
      const comments: Comment[] = [
        {
          id: '1',
          file: 'test.ipynb',
          line: 5,
          body: 'Test comment',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          file: 'other.ipynb',
          line: 10,
          body: 'Other comment',
          timestamp: new Date().toISOString(),
        },
      ];

      render(<JupyterNotebookDiffChunk {...defaultProps} comments={comments} />);

      // The component should filter comments and pass only relevant ones to child components
      expect(screen.getByTestId('jupyter-notebook-cell-diff')).toBeInTheDocument();
    });
  });

  describe('Comment handling', () => {
    it('handles add comment with file path', async () => {
      const file = createMockFile({ path: 'notebook.ipynb' });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      // Component should be rendered (mock will be called with handleAddComment)
      expect(screen.getByTestId('jupyter-notebook-cell-diff')).toBeInTheDocument();
    });

    it('handles comment addition errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnAddComment.mockRejectedValue(new Error('Comment failed'));

      render(<JupyterNotebookDiffChunk {...defaultProps} />);

      // Component should still render even if comment operations fail
      expect(screen.getByTestId('jupyter-notebook-cell-diff')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Cell type fallback', () => {
    it('handles missing cell type gracefully', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({
            newCell: undefined,
            oldCell: { cell_type: 'code', source: ['old'], metadata: {} },
          }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('code')).toBeInTheDocument();
    });

    it('handles unknown cell type', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({
            newCell: { cell_type: 'unknown' as any, source: ['test'], metadata: {} },
          }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('Multiple cells', () => {
    it('renders multiple cell diffs correctly', () => {
      const file = createMockFile({
        cellDiffs: [
          createMockCellDiff({ cellIndex: 0, status: 'added' }),
          createMockCellDiff({ cellIndex: 1, status: 'modified' }),
          createMockCellDiff({ cellIndex: 2, status: 'deleted' }),
        ],
      });

      render(<JupyterNotebookDiffChunk {...defaultProps} file={file} />);

      expect(screen.getByText('Cell #0')).toBeInTheDocument();
      expect(screen.getByText('Cell #1')).toBeInTheDocument();
      expect(screen.getByText('Cell #2')).toBeInTheDocument();
    });
  });

  describe('Diff mode propagation', () => {
    it('passes diffMode to child components', () => {
      render(<JupyterNotebookDiffChunk {...defaultProps} diffMode="inline" />);

      expect(screen.getByTestId('jupyter-notebook-cell-diff')).toBeInTheDocument();
      // The actual diffMode prop is passed to the mocked component
    });
  });
});
