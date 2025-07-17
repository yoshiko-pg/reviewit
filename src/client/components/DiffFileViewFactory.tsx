import {
  type DiffFile,
  type GeneralDiffFile,
  type Comment,
  type LineNumber,
  isNotebookDiffFile,
} from '../../types/diff';
import { isImageFile } from '../utils/imageUtils';

import { DiffChunk } from './DiffChunk';
import { DiffFileHeader } from './DiffFileHeader';
import { ImageDiffChunk } from './ImageDiffChunk';
import { JupyterNotebookDiffChunk } from './JupyterNotebookDiffChunk';
import { setCurrentFilename } from './PrismSyntaxHighlighter';
import type { AppearanceSettings } from './SettingsModal';

interface DiffFileViewFactoryProps {
  file: DiffFile;
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
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
  baseCommitish?: string;
  targetCommitish?: string;
}

export function DiffFileViewFactory({
  file,
  comments,
  diffMode,
  reviewedFiles,
  onToggleReviewed,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  syntaxTheme,
  baseCommitish,
  targetCommitish,
}: DiffFileViewFactoryProps) {
  // Route to appropriate component based on file type

  // 1. Jupyter Notebook files
  if (isNotebookDiffFile(file)) {
    return (
      <JupyterNotebookDiffChunk
        file={file}
        comments={comments}
        diffMode={diffMode}
        reviewedFiles={reviewedFiles}
        onToggleReviewed={onToggleReviewed}
        onAddComment={onAddComment}
        onGeneratePrompt={onGeneratePrompt}
        onRemoveComment={onRemoveComment}
        onUpdateComment={onUpdateComment}
      />
    );
  }

  // 2. Regular files (automatically narrowed to GeneralDiffFile)
  return (
    <GeneralDiffFileView
      file={file}
      comments={comments}
      diffMode={diffMode}
      reviewedFiles={reviewedFiles}
      onToggleReviewed={onToggleReviewed}
      onAddComment={onAddComment}
      onGeneratePrompt={onGeneratePrompt}
      onRemoveComment={onRemoveComment}
      onUpdateComment={onUpdateComment}
      syntaxTheme={syntaxTheme}
      baseCommitish={baseCommitish}
      targetCommitish={targetCommitish}
    />
  );
}

// Component for regular (non-notebook) files
interface GeneralDiffFileViewProps {
  file: GeneralDiffFile;
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
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
  baseCommitish?: string;
  targetCommitish?: string;
}

function GeneralDiffFileView({
  file,
  comments,
  diffMode,
  reviewedFiles,
  onToggleReviewed,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  syntaxTheme,
  baseCommitish,
  targetCommitish,
}: GeneralDiffFileViewProps) {
  const isCollapsed = reviewedFiles.has(file.path);

  // Set filename for syntax highlighter immediately
  setCurrentFilename(file.path);

  const handleAddComment = async (line: LineNumber, body: string, codeContent?: string) => {
    try {
      await onAddComment(file.path, line, body, codeContent);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className="bg-github-bg-primary">
      <DiffFileHeader
        file={file}
        isCollapsed={isCollapsed}
        onToggleReviewed={onToggleReviewed}
        reviewedFiles={reviewedFiles}
      />

      {!isCollapsed && (
        <div className="overflow-y-auto">
          {isImageFile(file.path) ?
            <ImageDiffChunk
              file={file}
              mode={diffMode}
              baseCommitish={baseCommitish}
              targetCommitish={targetCommitish}
            />
          : file.chunks.map((chunk, index) => (
              <div key={index} className="border-b border-github-border">
                <div className="bg-github-bg-tertiary px-3 py-2 border-b border-github-border">
                  <code className="text-github-text-secondary text-xs font-mono">
                    {chunk.header}
                  </code>
                </div>
                <DiffChunk
                  chunk={chunk}
                  comments={comments}
                  onAddComment={handleAddComment}
                  onGeneratePrompt={onGeneratePrompt}
                  onRemoveComment={onRemoveComment}
                  onUpdateComment={onUpdateComment}
                  mode={diffMode}
                  syntaxTheme={syntaxTheme}
                />
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// Export the factory as the default component
export default DiffFileViewFactory;
