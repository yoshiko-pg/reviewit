import { ChevronDown, ChevronRight, Play, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { type CellDiff, type Comment } from '../../types/diff';

import { DiffChunk } from './DiffChunk';

interface NotebookCellDiffProps {
  cellDiff: CellDiff;
  comments: Comment[];
  diffMode: 'side-by-side' | 'inline';
  onAddComment: (line: number, body: string, codeContent?: string) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
}

export function NotebookCellDiff({
  cellDiff,
  comments,
  diffMode,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
}: NotebookCellDiffProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [showOutputs, setShowOutputs] = useState(true);

  const renderCellContent = () => {
    // Always use DiffChunk for consistent git diff format
    if (cellDiff.sourceChanges && cellDiff.sourceChanges.length > 0) {
      return (
        <div>
          {cellDiff.sourceChanges.map((chunk, index) => (
            <DiffChunk
              key={index}
              chunk={chunk}
              comments={comments}
              onAddComment={onAddComment}
              onGeneratePrompt={onGeneratePrompt}
              onRemoveComment={onRemoveComment}
              onUpdateComment={onUpdateComment}
              mode={diffMode}
            />
          ))}

          {/* Output Changes - use DiffChunk format */}
          {cellDiff.outputDiffChunks && cellDiff.outputDiffChunks.length > 0 && (
            <div className="mt-4 border-t border-github-border pt-4">
              <button
                onClick={() => setShowOutputs(!showOutputs)}
                className="flex items-center gap-2 text-sm font-medium text-github-text-primary mb-2 hover:text-github-accent transition-colors"
              >
                {showOutputs ? <Eye size={14} /> : <EyeOff size={14} />}
                <Play size={14} />
                Output Changes
                {showOutputs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showOutputs && (
                <div>
                  {cellDiff.outputDiffChunks.map((chunk, index) => (
                    <DiffChunk
                      key={index}
                      chunk={chunk}
                      comments={comments}
                      onAddComment={onAddComment}
                      onGeneratePrompt={onGeneratePrompt}
                      onRemoveComment={onRemoveComment}
                      onUpdateComment={onUpdateComment}
                      mode={diffMode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata Changes */}
          {cellDiff.metadataChanged && (
            <div className="mt-4 border-t border-github-border pt-4">
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="flex items-center gap-2 text-sm font-medium text-github-text-primary mb-2 hover:text-github-accent transition-colors"
              >
                {showMetadata ? <Eye size={14} /> : <EyeOff size={14} />}
                <RotateCcw size={14} />
                Metadata Changes
                {showMetadata ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showMetadata && (
                <div className="bg-blue-50/50 border-l-4 border-blue-500 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-red-600 mb-1">Before:</div>
                      <pre className="text-sm bg-red-100/50 p-2 rounded overflow-x-auto text-red-800">
                        {JSON.stringify(cellDiff.oldCell?.metadata || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs text-green-600 mb-1">After:</div>
                      <pre className="text-sm bg-green-100/50 p-2 rounded overflow-x-auto text-green-800">
                        {JSON.stringify(cellDiff.newCell?.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // If no source changes, show a placeholder
    return (
      <div className="p-4 text-github-text-secondary text-sm">
        No source changes detected in this cell.
      </div>
    );
  };

  return (
    <div className="border-l-4 border-l-transparent hover:border-l-github-accent transition-colors">
      {renderCellContent()}
    </div>
  );
}
