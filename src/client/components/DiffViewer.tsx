import { useState } from 'react';
import { DiffFile, Comment } from '../../types/diff';
import { DiffChunk } from './DiffChunk';
import { useComments } from './CommentContext';
import { setCurrentFilename } from './PrismSyntaxHighlighter';

interface DiffViewerProps {
  file: DiffFile;
  comments: Comment[];
  diffMode: 'side-by-side' | 'inline';
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
}

export function DiffViewer({
  file,
  comments,
  diffMode,
  reviewedFiles,
  onToggleReviewed,
}: DiffViewerProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(
    new Set(file.chunks.map((_, index) => index))
  );
  const { onAddComment } = useComments();

  // Set filename for syntax highlighter immediately
  setCurrentFilename(file.path);

  const toggleChunk = (index: number) => {
    setExpandedChunks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedChunks(new Set(file.chunks.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedChunks(new Set());
  };

  const getFileIcon = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return '🆕';
      case 'deleted':
        return '🗑️';
      case 'renamed':
        return '📝';
      default:
        return '📄';
    }
  };

  const handleAddComment = async (line: number, body: string) => {
    try {
      await onAddComment(file.path, line, body);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-github-bg-primary">
      <div className="bg-github-bg-secondary border-b border-github-border px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base">{getFileIcon(file.status)}</span>
          <h2 className="text-base font-semibold text-github-text-primary m-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {file.path}
          </h2>
          {file.oldPath && file.oldPath !== file.path && (
            <span className="text-xs text-github-text-muted italic">
              (renamed from {file.oldPath})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="w-4 h-4 cursor-pointer accent-github-accent"
            checked={reviewedFiles.has(file.path)}
            onChange={() => onToggleReviewed(file.path)}
            title={reviewedFiles.has(file.path) ? 'Mark as not reviewed' : 'Mark as reviewed'}
          />
          <span className="text-sm text-github-text-secondary">Viewed</span>
          <button
            className="bg-transparent border-none cursor-pointer px-1.5 py-1 rounded text-sm text-github-text-secondary transition-all hover:bg-github-bg-tertiary hover:text-github-text-primary"
            onClick={() => {
              navigator.clipboard
                .writeText(file.path)
                .then(() => {
                  console.log('File path copied to clipboard:', file.path);
                })
                .catch((err) => {
                  console.error('Failed to copy file path:', err);
                });
            }}
            title="Copy file path"
          >
            📋
          </button>
          <button
            className="bg-transparent border-none cursor-pointer px-1.5 py-1 rounded text-base text-github-text-secondary transition-all hover:bg-github-bg-tertiary hover:text-github-text-primary"
            title="More options"
          >
            ⋯
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-medium rounded border bg-github-bg-tertiary text-github-text-primary border-github-border hover:opacity-80 transition-all"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-medium rounded border bg-github-bg-tertiary text-github-text-primary border-github-border hover:opacity-80 transition-all"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {file.chunks.map((chunk, index) => (
          <div key={index} className="border-b border-github-border">
            <div
              className="bg-github-bg-tertiary px-3 py-2 cursor-pointer flex items-center gap-2 border-b border-github-border transition-colors hover:bg-github-bg-secondary"
              onClick={() => toggleChunk(index)}
            >
              <span className="text-github-text-muted text-xs w-3 text-center">
                {expandedChunks.has(index) ? '▼' : '▶'}
              </span>
              <code className="text-github-text-secondary text-xs font-mono">{chunk.header}</code>
            </div>

            {expandedChunks.has(index) && (
              <DiffChunk
                chunk={chunk}
                comments={comments}
                onAddComment={handleAddComment}
                mode={diffMode}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
