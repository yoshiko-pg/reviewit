import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Comment } from '../../types/diff';

import { CommentsListModal } from './CommentsListModal';

const mockComments: Comment[] = [
  {
    id: '1',
    file: 'src/file1.ts',
    line: 10,
    body: 'First comment',
    timestamp: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    file: 'src/file1.ts',
    line: [20, 25],
    body: 'Second comment on range',
    timestamp: '2024-01-01T00:01:00Z',
  },
  {
    id: '3',
    file: 'src/file2.ts',
    line: 42,
    body: 'Third comment',
    timestamp: '2024-01-01T00:02:00Z',
  },
];

const mockRemoveComment = vi.fn();

describe('CommentsListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const { container } = render(
      <CommentsListModal
        isOpen={false}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );
    expect(screen.getByText('All Comments')).toBeInTheDocument();
  });

  it('should display all comments grouped by file', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );

    // Check file headers
    expect(screen.getByText('src/file1.ts')).toBeInTheDocument();
    expect(screen.getByText('src/file2.ts')).toBeInTheDocument();

    // Check comment bodies
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment on range')).toBeInTheDocument();
    expect(screen.getByText('Third comment')).toBeInTheDocument();
  });

  it('should display line numbers correctly', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );

    // Check that file paths and line numbers are displayed
    const filePathSpans = screen.getAllByText((content, element) => {
      return !!(
        element?.className?.includes('font-mono') &&
        element?.tagName === 'SPAN' &&
        content.includes('src/')
      );
    });

    expect(filePathSpans.length).toBe(3); // Three comments
  });

  it('should call onNavigate when clicking on a comment', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );

    const firstComment = screen.getByText('First comment').closest('div');
    fireEvent.click(firstComment!);

    expect(onNavigate).toHaveBeenCalledWith(mockComments[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onRemoveComment when delete button is clicked', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();

    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );

    const deleteButtons = screen.getAllByTitle('Resolve');
    fireEvent.click(deleteButtons[0]!);

    expect(mockRemoveComment).toHaveBeenCalledWith('1');
  });

  it('should show empty state when no comments', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={[]}
        onRemoveComment={mockRemoveComment}
      />
    );

    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );

    const closeButton = screen.getByLabelText('Close comments list');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CommentsListModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
        comments={mockComments}
        onRemoveComment={mockRemoveComment}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
