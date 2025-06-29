import React, { useState } from 'react';
import { DiffChunk as DiffChunkType, DiffLine, Comment } from '../../types/diff';
import { CommentForm } from './CommentForm';
import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';

interface SideBySideDiffChunkProps {
  chunk: DiffChunkType;
  comments: Comment[];
  onAddComment: (line: number, body: string) => Promise<void>;
}

interface SideBySideLine {
  oldLine?: DiffLine;
  newLine?: DiffLine;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function SideBySideDiffChunk({ chunk, comments, onAddComment }: SideBySideDiffChunkProps) {
  const [commentingLine, setCommentingLine] = useState<number | null>(null);

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

  // Convert unified diff to side-by-side format
  const convertToSideBySide = (lines: DiffLine[]): SideBySideLine[] => {
    const result: SideBySideLine[] = [];
    let oldLineNum = chunk.oldStart;
    let newLineNum = chunk.newStart;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.type === 'normal') {
        result.push({
          oldLine: line,
          newLine: { ...line },
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
        });
        oldLineNum++;
        newLineNum++;
        i++;
      } else if (line.type === 'delete') {
        // Look ahead for corresponding add
        let j = i + 1;
        while (j < lines.length && lines[j].type === 'delete') {
          j++;
        }

        const deleteLines = lines.slice(i, j);
        const addLines: DiffLine[] = [];

        // Collect corresponding add lines
        while (j < lines.length && lines[j].type === 'add') {
          addLines.push(lines[j]);
          j++;
        }

        // Pair delete and add lines
        const maxLines = Math.max(deleteLines.length, addLines.length);
        for (let k = 0; k < maxLines; k++) {
          const deleteLine = deleteLines[k];
          const addLine = addLines[k];

          result.push({
            oldLine: deleteLine,
            newLine: addLine,
            oldLineNumber: deleteLine ? oldLineNum + k : undefined,
            newLineNumber: addLine ? newLineNum + k : undefined,
          });
        }

        oldLineNum += deleteLines.length;
        newLineNum += addLines.length;
        i = j;
      } else if (line.type === 'add') {
        result.push({
          newLine: line,
          newLineNumber: newLineNum,
        });
        newLineNum++;
        i++;
      }
    }

    return result;
  };

  const sideBySideLines = convertToSideBySide(chunk.lines);

  return (
    <div className="bg-github-bg-primary border border-github-border rounded-md overflow-hidden">
      <table className="w-full border-collapse font-mono text-xs leading-5">
        <tbody>
          {sideBySideLines.map((sideLine, index) => {
            const leftComments = sideLine.oldLineNumber
              ? getCommentsForLine(sideLine.oldLineNumber)
              : [];
            const rightComments = sideLine.newLineNumber
              ? getCommentsForLine(sideLine.newLineNumber)
              : [];
            // Remove duplicate comments (display comments with the same ID only once)
            const allComments = Array.from(
              new Map(
                [...leftComments, ...rightComments].map((comment) => [comment.id, comment])
              ).values()
            );

            return (
              <React.Fragment key={index}>
                <tr className="group">
                  {/* Old side */}
                  <td className="w-[60px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top">
                    {sideLine.oldLineNumber || ''}
                  </td>
                  <td
                    className={`w-1/2 p-0 align-top border-r border-github-border relative ${
                      sideLine.oldLine?.type === 'delete'
                        ? 'bg-diff-deletion-bg cursor-pointer'
                        : sideLine.oldLine?.type === 'normal'
                          ? 'bg-transparent'
                          : 'bg-github-bg-secondary'
                    }`}
                    onClick={() =>
                      sideLine.oldLine?.type === 'delete' &&
                      sideLine.oldLineNumber &&
                      handleAddComment(sideLine.oldLineNumber)
                    }
                    title={
                      sideLine.oldLine?.type === 'delete' && sideLine.oldLineNumber
                        ? 'Click to add comment'
                        : ''
                    }
                  >
                    {sideLine.oldLine && (
                      <div className="flex items-center relative min-h-[20px] px-3">
                        <PrismSyntaxHighlighter
                          code={sideLine.oldLine.content}
                          className="flex-1 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
                        />
                      </div>
                    )}
                  </td>

                  {/* New side */}
                  <td className="w-[60px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top">
                    {sideLine.newLineNumber || ''}
                  </td>
                  <td
                    className={`w-1/2 p-0 align-top relative ${
                      sideLine.newLine?.type === 'add'
                        ? 'bg-diff-addition-bg cursor-pointer'
                        : sideLine.newLine?.type === 'normal'
                          ? 'bg-transparent cursor-pointer'
                          : 'bg-github-bg-secondary'
                    }`}
                    onClick={() =>
                      (sideLine.newLine?.type === 'add' || sideLine.newLine?.type === 'normal') &&
                      sideLine.newLineNumber &&
                      handleAddComment(sideLine.newLineNumber)
                    }
                    title={
                      (sideLine.newLine?.type === 'add' || sideLine.newLine?.type === 'normal') &&
                      sideLine.newLineNumber
                        ? 'Click to add comment'
                        : ''
                    }
                  >
                    {sideLine.newLine && (
                      <div className="flex items-center relative min-h-[20px] px-3">
                        <PrismSyntaxHighlighter
                          code={sideLine.newLine.content}
                          className="flex-1 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
                        />
                      </div>
                    )}
                  </td>
                </tr>

                {/* Comments row */}
                {allComments.length > 0 && (
                  <tr className="bg-github-bg-secondary">
                    <td colSpan={4} className="p-0 border-t border-github-border">
                      {allComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="m-2 mx-3 p-2 bg-github-bg-tertiary border border-github-border rounded-md"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-github-text-muted">
                              Line {comment.line} • {new Date(comment.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-github-text-primary text-[13px] leading-6 whitespace-pre-wrap">
                            {comment.body}
                          </div>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}

                {/* Comment form row */}
                {commentingLine &&
                  ((commentingLine === sideLine.oldLineNumber &&
                    sideLine.oldLine?.type === 'delete') ||
                    (commentingLine === sideLine.newLineNumber &&
                      (sideLine.newLine?.type === 'add' ||
                        sideLine.newLine?.type === 'normal'))) && (
                    <tr className="bg-github-bg-secondary">
                      <td colSpan={4} className="p-0 border-t border-github-border">
                        <CommentForm
                          onSubmit={handleSubmitComment}
                          onCancel={handleCancelComment}
                        />
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
