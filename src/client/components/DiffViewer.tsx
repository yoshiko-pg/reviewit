import {
  FileText,
  FilePlus,
  FileX,
  FilePen,
  Copy,
  ChevronRight,
  ChevronDown,
  Check,
  Square,
} from 'lucide-react';

import { type DiffFile, type Comment } from '../../types/diff';

import { DiffChunk } from './DiffChunk';
import { setCurrentFilename } from './PrismSyntaxHighlighter';

interface DiffViewerProps {
  file: DiffFile;
  comments: Comment[];
  diffMode: 'side-by-side' | 'inline';
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
  onAddComment: (file: string, line: number, body: string, codeContent?: string) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
}

export function DiffViewer({
  file,
  comments,
  diffMode,
  reviewedFiles,
  onToggleReviewed,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
}: DiffViewerProps) {
  const isCollapsed = reviewedFiles.has(file.path);

  // Set filename for syntax highlighter immediately
  setCurrentFilename(file.path);

  const getFileIcon = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return <FilePlus size={16} className="text-github-accent" />;
      case 'deleted':
        return <FileX size={16} className="text-github-danger" />;
      case 'renamed':
        return <FilePen size={16} className="text-github-warning" />;
      default:
        return <FileText size={16} className="text-github-text-secondary" />;
    }
  };

  const handleAddComment = async (line: number, body: string, codeContent?: string) => {
    try {
      await onAddComment(file.path, line, body, codeContent);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className="bg-github-bg-primary">
      <div className="bg-github-bg-secondary border-b border-github-border px-5 py-4 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => onToggleReviewed(file.path)}
            className="text-github-text-muted hover:text-github-text-primary transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand file' : 'Collapse file'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          {getFileIcon(file.status)}
          <h2 className="text-sm font-mono text-github-text-primary m-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {file.path}
          </h2>
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
            <Copy size={14} />
          </button>
          {file.oldPath && file.oldPath !== file.path && (
            <span className="text-xs text-github-text-muted italic">
              (renamed from {file.oldPath})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium px-1 py-0.5 rounded text-github-accent bg-green-100/10">
              +{file.additions}
            </span>
            <span className="font-medium px-1 py-0.5 rounded text-github-danger bg-red-100/10">
              -{file.deletions}
            </span>
          </div>
          <button
            onClick={() => onToggleReviewed(file.path)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              reviewedFiles.has(file.path)
                ? 'bg-github-accent text-white'
                : 'bg-gray-600 text-gray-200 border border-gray-500 hover:bg-gray-500 hover:text-white'
            }`}
            title={reviewedFiles.has(file.path) ? 'Mark as not reviewed' : 'Mark as reviewed'}
          >
            {reviewedFiles.has(file.path) ? <Check size={14} /> : <Square size={14} />}
            Viewed
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="overflow-y-auto">
          {file.chunks.map((chunk, index) => (
            <div key={index} className="border-b border-github-border">
              <div className="bg-github-bg-tertiary px-3 py-2 border-b border-github-border">
                <code className="text-github-text-secondary text-xs font-mono">{chunk.header}</code>
              </div>
              <DiffChunk
                chunk={chunk}
                comments={comments}
                onAddComment={handleAddComment}
                onGeneratePrompt={onGeneratePrompt}
                onRemoveComment={onRemoveComment}
                onUpdateComment={onUpdateComment}
                mode={diffMode}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
