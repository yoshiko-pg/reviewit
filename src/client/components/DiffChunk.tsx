import React, { useState } from 'react';
import { DiffChunk as DiffChunkType, DiffLine, Comment } from '../../types/diff';
import { CommentForm } from './CommentForm';
import { SideBySideDiffChunk } from './SideBySideDiffChunk';
import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';

interface DiffChunkProps {
  chunk: DiffChunkType;
  comments: Comment[];
  onAddComment: (line: number, body: string) => Promise<void>;
  mode?: 'side-by-side' | 'inline';
}

export function DiffChunk({ chunk, comments, onAddComment, mode = 'inline' }: DiffChunkProps) {
  const [commentingLine, setCommentingLine] = useState<number | null>(null);

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

  const handleAddComment = (lineNumber: number) => {
    if (commentingLine === lineNumber) {
      setCommentingLine(null);
    } else {
      setCommentingLine(lineNumber);
    }
  };

  const handleCancelComment = () => {
    setCommentingLine(null);
  };

  const handleSubmitComment = async (body: string) => {
    if (commentingLine !== null) {
      await onAddComment(commentingLine, body);
      setCommentingLine(null);
    }
  };

  const getCommentsForLine = (lineNumber: number) => {
    return comments.filter((c) => c.line === lineNumber);
  };

  // Use side-by-side component for side-by-side mode
  if (mode === 'side-by-side') {
    return <SideBySideDiffChunk chunk={chunk} comments={comments} onAddComment={onAddComment} />;
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
                  onClick={() => handleAddComment(line.newLineNumber || line.oldLineNumber || 0)}
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
                  <tr key={comment.id} className="bg-[var(--bg-secondary)]">
                    <td colSpan={3} className="p-0 border-t border-[var(--border-muted)]">
                      <div className="m-2 mx-3 p-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Line {comment.line} • {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[var(--text-primary)] text-[13px] leading-6 whitespace-pre-wrap">
                          {comment.body}
                        </div>
                      </div>
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
