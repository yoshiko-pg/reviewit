import { type DiffFile, type Comment, type LineNumber } from '../../types/diff';

import { DiffFileViewFactory } from './DiffFileViewFactory';
import type { AppearanceSettings } from './SettingsModal';

interface DiffViewerProps {
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
  syntaxTheme,
  baseCommitish,
  targetCommitish,
}: DiffViewerProps) {
  // Use the factory to determine the appropriate component
  return (
    <DiffFileViewFactory
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
