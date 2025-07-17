import {
  FileDiff,
  FilePlus,
  FileX,
  FilePen,
  Copy,
  ChevronRight,
  ChevronDown,
  Check,
  Square,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

import { type GeneralDiffFile } from '../../types/diff';
import { type NotebookDiffFile } from '../../types/notebook';

type DiffFileHeaderProps = {
  file: GeneralDiffFile | NotebookDiffFile;
  isCollapsed: boolean;
  onToggleReviewed: (path: string) => void;
  reviewedFiles: Set<string>;
  children?: React.ReactNode; // For custom badges or additional content
};

export function DiffFileHeader({
  file,
  isCollapsed,
  onToggleReviewed,
  reviewedFiles,
  children,
}: DiffFileHeaderProps) {
  const [isCopied, setIsCopied] = useState(false);

  const getFileIcon = (status: GeneralDiffFile['status'] | NotebookDiffFile['status']) => {
    switch (status) {
      case 'added':
        return <FilePlus size={16} className="text-github-accent" />;
      case 'deleted':
        return <FileX size={16} className="text-github-danger" />;
      case 'renamed':
        return <FilePen size={16} className="text-github-warning" />;
      default:
        return 'cellDiffs' in file ?
            <FileText size={16} className="text-github-text-secondary" />
          : <FileDiff size={16} className="text-github-text-secondary" />;
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard
      .writeText(file.path)
      .then(() => {
        console.log('File path copied to clipboard:', file.path);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy file path:', err);
      });
  };

  const getFileStats = () => {
    if ('cellDiffs' in file) {
      // Notebook file stats
      const notebookFile = file as NotebookDiffFile;
      return (
        <div className="flex items-center gap-2 text-xs">
          {notebookFile.totalCellsAdded > 0 && (
            <span className="font-medium px-2 py-1 rounded text-github-accent bg-green-100/10 flex items-center gap-1">
              <FilePlus size={12} />
              {notebookFile.totalCellsAdded} cells
            </span>
          )}
          {notebookFile.totalCellsDeleted > 0 && (
            <span className="font-medium px-2 py-1 rounded text-github-danger bg-red-100/10 flex items-center gap-1">
              <FileX size={12} />
              {notebookFile.totalCellsDeleted} cells
            </span>
          )}
          {notebookFile.totalCellsModified > 0 && (
            <span className="font-medium px-2 py-1 rounded text-github-warning bg-yellow-100/10 flex items-center gap-1">
              <FilePen size={12} />
              {notebookFile.totalCellsModified} cells
            </span>
          )}
          {notebookFile.metadataChanged && (
            <span className="font-medium px-2 py-1 rounded text-blue-600 bg-blue-100/10 text-xs">
              metadata changed
            </span>
          )}
        </div>
      );
    } else {
      // Regular file stats
      const generalFile = file as GeneralDiffFile;
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium px-1 py-0.5 rounded text-github-accent bg-green-100/10">
            +{generalFile.additions}
          </span>
          <span className="font-medium px-1 py-0.5 rounded text-github-danger bg-red-100/10">
            -{generalFile.deletions}
          </span>
        </div>
      );
    }
  };

  return (
    <div className="bg-github-bg-secondary border-t-2 border-t-github-accent border-b border-github-border px-5 py-4 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={() => onToggleReviewed(file.path)}
          className="text-github-text-muted hover:text-github-text-primary transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand file' : 'Collapse file'}
        >
          {isCollapsed ?
            <ChevronRight size={16} />
          : <ChevronDown size={16} />}
        </button>
        {getFileIcon(file.status)}
        <h2 className="text-sm font-mono text-github-text-primary m-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {file.path}
        </h2>
        {children && <div className="flex items-center gap-2">{children}</div>}
        <button
          className={`bg-transparent border-none cursor-pointer px-1.5 py-1 rounded text-sm transition-all hover:bg-github-bg-tertiary ${
            isCopied ? 'text-github-accent' : (
              'text-github-text-secondary hover:text-github-text-primary'
            )
          }`}
          onClick={handleCopyPath}
          title="Copy file path"
        >
          {isCopied ?
            <Check size={14} />
          : <Copy size={14} />}
        </button>
        {file.oldPath && file.oldPath !== file.path && (
          <span className="text-xs text-github-text-muted italic">
            (renamed from {file.oldPath})
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {getFileStats()}
        <button
          onClick={() => onToggleReviewed(file.path)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
            reviewedFiles.has(file.path) ?
              'bg-github-accent text-white'
            : 'dark:bg-slate-600 dark:text-white dark:border-slate-500 dark:hover:bg-slate-500 dark:hover:border-slate-400 bg-github-bg-secondary text-github-text-primary border border-github-border hover:bg-github-bg-tertiary hover:border-github-text-muted'
          }`}
          title={reviewedFiles.has(file.path) ? 'Mark as not reviewed' : 'Mark as reviewed'}
        >
          {reviewedFiles.has(file.path) ?
            <Check size={14} />
          : <Square size={14} />}
          Viewed
        </button>
      </div>
    </div>
  );
}
