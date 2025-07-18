import { BookOpen, Code, FileType, FileText } from 'lucide-react';

import { type Comment, type LineNumber } from '../../types/diff';
import { type NotebookDiffFile } from '../../types/notebook';

import { DiffFileHeader } from './DiffFileHeader';
import { JupyterNotebookCellDiff } from './JupyterNotebookCellDiff';

interface JupyterNotebookDiffChunkProps {
  file: NotebookDiffFile;
  comments: Comment[];
  diffMode: 'side-by-side' | 'inline';
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
  onAddComment: (
    file: string,
    line: LineNumber,
    body: string,
    codeContent?: string
  ) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
}

export function JupyterNotebookDiffChunk({
  file,
  comments,
  diffMode,
  reviewedFiles,
  onToggleReviewed,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
}: JupyterNotebookDiffChunkProps) {
  const isCollapsed = reviewedFiles.has(file.path);

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

  const handleAddComment = async (line: LineNumber, body: string, codeContent?: string) => {
    try {
      await onAddComment(file.path, line, body, codeContent);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const totalChanges = file.totalCellsAdded + file.totalCellsDeleted + file.totalCellsModified;

  return (
    <div className="bg-github-bg-primary">
      <DiffFileHeader
        file={file}
        isCollapsed={isCollapsed}
        onToggleReviewed={onToggleReviewed}
        reviewedFiles={reviewedFiles}
      >
        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
          Notebook
        </span>
      </DiffFileHeader>

      {!isCollapsed && (
        <div className="overflow-y-auto">
          {totalChanges === 0 ?
            <div className="p-8 text-center text-github-text-secondary">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>No cell changes detected in this notebook</p>
              {file.metadataChanged && (
                <p className="text-sm mt-2">Only metadata has been modified</p>
              )}
            </div>
          : <>
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
                          cellDiff.status === 'added' ? 'bg-green-100/20 text-github-accent'
                          : cellDiff.status === 'deleted' ? 'bg-red-100/20 text-github-danger'
                          : 'bg-yellow-100/20 text-github-warning'
                        }`}
                      >
                        {cellDiff.status}
                      </span>
                    </div>
                    <JupyterNotebookCellDiff
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
          }
        </div>
      )}
    </div>
  );
}
