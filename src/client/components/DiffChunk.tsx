import React, { useState } from 'react';
import { DiffChunk as DiffChunkType, DiffLine, Comment } from '../../types/diff';
import { CommentForm } from './CommentForm';
import { InlineComment } from './InlineComment';
import { SideBySideDiffChunk } from './SideBySideDiffChunk';
import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';

interface DiffChunkProps {
  chunk: DiffChunkType;
  comments: Comment[];
  onAddComment: (line: number, body: string, codeContent?: string) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
  mode?: 'side-by-side' | 'inline';
}

export function DiffChunk({
  chunk,
  comments,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  mode = 'inline',
}: DiffChunkProps) {
  const [commentingLine, setCommentingLine] = useState<number | null>(null);
  const [commentingLineContent, setCommentingLineContent] = useState<string | null>(null);

  const getLineClass = (line: DiffLine) => {
    switch (line.type) {
      case 'add':
        return 'bg-diff-addition-bg';
      case 'delete':
        return 'bg-diff-deletion-bg';
      default:
        return 'bg-transparent';
    }
  };

  const getLinePrefix = (line: DiffLine) => {
    switch (line.type) {
      case 'add':
        return '+';
      case 'delete':
        return '-';
      default:
        return ' ';
    }
  };

  const handleAddComment = (lineNumber: number, lineContent: string) => {
    if (commentingLine === lineNumber) {
      setCommentingLine(null);
      setCommentingLineContent(null);
    } else {
      setCommentingLine(lineNumber);
      setCommentingLineContent(lineContent);
    }
  };

  const handleCancelComment = () => {
    setCommentingLine(null);
    setCommentingLineContent(null);
  };

  const handleSubmitComment = async (body: string) => {
    if (commentingLine !== null) {
      await onAddComment(commentingLine, body, commentingLineContent || undefined);
      setCommentingLine(null);
      setCommentingLineContent(null);
    }
  };

  const getCommentsForLine = (lineNumber: number) => {
    return comments.filter((c) => c.line === lineNumber);
  };

  // Use side-by-side component for side-by-side mode
  if (mode === 'side-by-side') {
    return (
      <SideBySideDiffChunk
        chunk={chunk}
        comments={comments}
        onAddComment={onAddComment}
        onGeneratePrompt={onGeneratePrompt}
        onRemoveComment={onRemoveComment}
        onUpdateComment={onUpdateComment}
      />
    );
  }

  return (
    <div className="bg-github-bg-primary">
      <table className="w-full border-collapse font-mono text-xs leading-5">
        <tbody>
          {chunk.lines.map((line, index) => {
            const lineComments = getCommentsForLine(line.newLineNumber || line.oldLineNumber || 0);

            return (
              <React.Fragment key={index}>
                <tr
                  className={`cursor-pointer group ${getLineClass(line)}`}
                  onClick={() =>
                    handleAddComment(line.newLineNumber || line.oldLineNumber || 0, line.content)
                  }
                  title="Click to add comment"
                >
                  <td className="w-[50px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top">
                    {line.oldLineNumber || ''}
                  </td>
                  <td className="w-[50px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top">
                    {line.newLineNumber || ''}
                  </td>
                  <td className="p-0 w-full relative align-top">
                    <div className="flex items-center relative min-h-[20px]">
                      <span
                        className={`w-5 text-center text-github-text-muted flex-shrink-0 bg-github-bg-secondary border-r border-github-border ${
                          line.type === 'add'
                            ? 'text-github-accent bg-diff-addition-bg'
                            : line.type === 'delete'
                              ? 'text-github-danger bg-diff-deletion-bg'
                              : ''
                        }`}
                      >
                        {getLinePrefix(line)}
                      </span>
                      <PrismSyntaxHighlighter
                        code={line.content}
                        className="flex-1 px-3 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
                      />
                    </div>
                  </td>
                </tr>

                {lineComments.map((comment) => (
                  <tr key={comment.id} className="bg-github-bg-secondary">
                    <td colSpan={3} className="p-0 border-t border-github-border">
                      <InlineComment
                        comment={comment}
                        onGeneratePrompt={onGeneratePrompt}
                        onRemoveComment={onRemoveComment}
                        onUpdateComment={onUpdateComment}
                      />
                    </td>
                  </tr>
                ))}

                {commentingLine === (line.newLineNumber || line.oldLineNumber) && (
                  <tr className="bg-[var(--bg-secondary)]">
                    <td colSpan={3} className="p-0 border-t border-[var(--border-muted)]">
                      <CommentForm onSubmit={handleSubmitComment} onCancel={handleCancelComment} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
