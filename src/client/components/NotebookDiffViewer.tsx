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
  BookOpen,
  Code,
  FileType,
} from 'lucide-react';

import { type NotebookDiffFile, type Comment } from '../../types/diff';

import { NotebookCellDiff } from './NotebookCellDiff';

interface NotebookDiffViewerProps {
  file: NotebookDiffFile;
  comments: Comment[];
  diffMode: 'side-by-side' | 'inline';
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
  onAddComment: (file: string, line: number, body: string, codeContent?: string) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
}

export function NotebookDiffViewer({
  file,
  comments,
  diffMode,
  reviewedFiles,
  onToggleReviewed,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
}: NotebookDiffViewerProps) {
  const isCollapsed = reviewedFiles.has(file.path);

  const getFileIcon = (status: NotebookDiffFile['status']) => {
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

  const getCellTypeIcon = (cellType: string) => {
    switch (cellType) {
      case 'code':
        return <Code size={14} className="text-gray-500" />;
      case 'markdown':
        return <FileType size={14} className="text-gray-500" />;
      case 'raw':
        return <FileText size={14} className="text-gray-500" />;
      default:
        return <FileText size={14} className="text-gray-500" />;
    }
  };

  const handleAddComment = async (line: number, body: string, codeContent?: string) => {
    try {
      await onAddComment(file.path, line, body, codeContent);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const totalChanges = file.totalCellsAdded + file.totalCellsDeleted + file.totalCellsModified;

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
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
            Notebook
          </span>
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
            {file.totalCellsAdded > 0 && (
              <span className="font-medium px-2 py-1 rounded text-github-accent bg-green-100/10 flex items-center gap-1">
                <FilePlus size={12} />
                {file.totalCellsAdded} cells
              </span>
            )}
            {file.totalCellsDeleted > 0 && (
              <span className="font-medium px-2 py-1 rounded text-github-danger bg-red-100/10 flex items-center gap-1">
                <FileX size={12} />
                {file.totalCellsDeleted} cells
              </span>
            )}
            {file.totalCellsModified > 0 && (
              <span className="font-medium px-2 py-1 rounded text-github-warning bg-yellow-100/10 flex items-center gap-1">
                <FilePen size={12} />
                {file.totalCellsModified} cells
              </span>
            )}
            {file.metadataChanged && (
              <span className="font-medium px-2 py-1 rounded text-blue-600 bg-blue-100/10 text-xs">
                metadata changed
              </span>
            )}
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
          {totalChanges === 0 ? (
            <div className="p-8 text-center text-github-text-secondary">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>No cell changes detected in this notebook</p>
              {file.metadataChanged && (
                <p className="text-sm mt-2">Only metadata has been modified</p>
              )}
            </div>
          ) : (
            <>
              {file.cellDiffs.map((cellDiff, index) => {
                if (cellDiff.status === 'unchanged') {
                  return null; // Skip unchanged cells to reduce clutter
                }

                return (
                  <div
                    key={`${cellDiff.cellIndex}-${index}`}
                    className="border-b border-github-border"
                  >
                    <div className="bg-github-bg-tertiary px-3 py-2 border-b border-github-border flex items-center gap-2">
                      <span className="text-github-text-secondary text-xs font-mono">
                        Cell #{cellDiff.cellIndex}
                      </span>
                      {cellDiff.newCell && getCellTypeIcon(cellDiff.newCell.cell_type)}
                      <span className="text-xs text-github-text-secondary">
                        {cellDiff.newCell?.cell_type || cellDiff.oldCell?.cell_type}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          cellDiff.status === 'added'
                            ? 'bg-green-100/20 text-github-accent'
                            : cellDiff.status === 'deleted'
                              ? 'bg-red-100/20 text-github-danger'
                              : 'bg-yellow-100/20 text-github-warning'
                        }`}
                      >
                        {cellDiff.status}
                      </span>
                    </div>
                    <NotebookCellDiff
                      cellDiff={cellDiff}
                      comments={comments.filter((c) => c.file === file.path)}
                      diffMode={diffMode}
                      onAddComment={handleAddComment}
                      onGeneratePrompt={onGeneratePrompt}
                      onRemoveComment={onRemoveComment}
                      onUpdateComment={onUpdateComment}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
