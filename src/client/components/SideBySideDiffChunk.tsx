import React, { useState } from 'react';

import { type DiffChunk as DiffChunkType, type DiffLine, type Comment } from '../../types/diff';

import { CommentForm } from './CommentForm';
import { InlineComment } from './InlineComment';
import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';
import type { AppearanceSettings } from './SettingsModal';

interface SideBySideDiffChunkProps {
  chunk: DiffChunkType;
  comments: Comment[];
  onAddComment: (
    line: number | [number, number],
    body: string,
    codeContent?: string
  ) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
}

interface SideBySideLine {
  oldLine?: DiffLine;
  newLine?: DiffLine;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function SideBySideDiffChunk({
  chunk,
  comments,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  syntaxTheme,
}: SideBySideDiffChunkProps) {
  const [startLine, setStartLine] = useState<number | null>(null);
  const [commentingLine, setCommentingLine] = useState<number | [number, number] | null>(null);

  const handleAddComment = (lineNumber: number | [number, number]) => {
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
    return comments.filter((c) =>
      Array.isArray(c.line) ? c.line[1] === lineNumber : c.line === lineNumber
    );
  };

  const getCommentLayout = (sideLine: SideBySideLine): 'left' | 'right' | 'full' => {
    // サイドバイサイドでは、削除行側（左）にコメントがある場合は左半分、
    // 追加行側（右）にコメントがある場合は右半分、
    // 変更なし行の場合は全幅で表示
    if (sideLine.oldLine?.type === 'delete' && sideLine.newLine?.type === 'add') {
      // 変更行の場合、newLineNumberを使って判定
      return sideLine.newLineNumber ? 'right' : 'left';
    }
    if (sideLine.oldLine?.type === 'delete') {
      return 'left';
    }
    if (sideLine.newLine?.type === 'add') {
      return 'right';
    }
    return 'full';
  };

  const getSelectedLineStyle = (side: 'old' | 'new', sideLine: SideBySideLine): string => {
    if (!commentingLine) {
      return '';
    }

    const start = Array.isArray(commentingLine) ? commentingLine[0] : commentingLine;
    const end = Array.isArray(commentingLine) ? commentingLine[1] : commentingLine;

    if (
      (side === 'old' &&
        sideLine.oldLine?.type === 'delete' &&
        sideLine.oldLineNumber &&
        sideLine.oldLineNumber >= start &&
        sideLine.oldLineNumber <= end) ||
      (side === 'new' &&
        sideLine.newLine?.type === 'add' &&
        sideLine.newLineNumber &&
        sideLine.newLineNumber >= start &&
        sideLine.newLineNumber <= end)
    ) {
      return 'after:bg-diff-selected-bg after:absolute after:inset-0 after:border-l-5 after:border-l-diff-selected-border';
    }

    return '';
  };

  // Convert unified diff to side-by-side format
  const convertToSideBySide = (lines: DiffLine[]): SideBySideLine[] => {
    const result: SideBySideLine[] = [];
    let oldLineNum = chunk.oldStart;
    let newLineNum = chunk.newStart;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        i++;
        continue;
      }

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
        while (j < lines.length && lines[j]?.type === 'delete') {
          j++;
        }

        const deleteLines = lines.slice(i, j);
        const addLines: DiffLine[] = [];

        // Collect corresponding add lines
        while (j < lines.length && lines[j]?.type === 'add') {
          const addLine = lines[j];
          if (addLine) {
            addLines.push(addLine);
          }
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
            // For side-by-side view, only show comments on the right side (new line numbers)
            // to avoid duplication. Comments are associated with line numbers and should
            // only be displayed once per line number.
            const allComments =
              sideLine.newLineNumber ? getCommentsForLine(sideLine.newLineNumber)
              : sideLine.oldLineNumber ? getCommentsForLine(sideLine.oldLineNumber)
              : [];

            return (
              <React.Fragment key={index}>
                <tr className="group">
                  {/* Old side */}
                  <td className="w-[60px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top">
                    {sideLine.oldLineNumber || ''}
                  </td>
                  <td
                    className={`w-1/2 p-0 align-top border-r border-github-border relative ${
                      sideLine.oldLine?.type === 'delete' ? 'bg-diff-deletion-bg cursor-pointer'
                      : sideLine.oldLine?.type === 'normal' ? 'bg-transparent'
                      : 'bg-github-bg-secondary'
                    } ${getSelectedLineStyle('old', sideLine)}`}
                    onMouseDown={() =>
                      sideLine.oldLine?.type === 'delete' &&
                      sideLine.oldLineNumber &&
                      setStartLine(sideLine.oldLineNumber)
                    }
                    onMouseUp={() => {
                      if (
                        sideLine.oldLine?.type !== 'delete' ||
                        sideLine.oldLineNumber === undefined
                      ) {
                        return;
                      }

                      if (!startLine || startLine === sideLine.oldLineNumber) {
                        handleAddComment(sideLine.oldLineNumber);
                        setStartLine(null);
                        return;
                      }

                      handleAddComment([startLine, sideLine.oldLineNumber]);
                      setStartLine(null);
                    }}
                    title={
                      sideLine.oldLine?.type === 'delete' && sideLine.oldLineNumber ?
                        'Click to add comment'
                      : ''
                    }
                  >
                    {sideLine.oldLine && (
                      <div className="flex items-center relative min-h-[20px] px-3">
                        <PrismSyntaxHighlighter
                          code={sideLine.oldLine.content}
                          className="flex-1 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
                          syntaxTheme={syntaxTheme}
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
                      sideLine.newLine?.type === 'add' ? 'bg-diff-addition-bg cursor-pointer'
                      : sideLine.newLine?.type === 'normal' ? 'bg-transparent cursor-pointer'
                      : 'bg-github-bg-secondary'
                    } ${getSelectedLineStyle('new', sideLine)}`}
                    onMouseDown={() =>
                      (sideLine.newLine?.type === 'add' || sideLine.newLine?.type === 'normal') &&
                      sideLine.newLineNumber &&
                      setStartLine(sideLine.newLineNumber)
                    }
                    onMouseUp={() => {
                      if (
                        (sideLine.newLine?.type !== 'add' && sideLine.newLine?.type !== 'normal') ||
                        sideLine.newLineNumber === undefined
                      ) {
                        return;
                      }

                      if (!startLine || startLine === sideLine.newLineNumber) {
                        handleAddComment(sideLine.newLineNumber);
                        setStartLine(null);
                        return;
                      }

                      handleAddComment([startLine, sideLine.newLineNumber]);
                      setStartLine(null);
                    }}
                    title={
                      (
                        (sideLine.newLine?.type === 'add' || sideLine.newLine?.type === 'normal') &&
                        sideLine.newLineNumber
                      ) ?
                        'Click to add comment'
                      : ''
                    }
                  >
                    {sideLine.newLine && (
                      <div className="flex items-center relative min-h-[20px] px-3">
                        <PrismSyntaxHighlighter
                          code={sideLine.newLine.content}
                          className="flex-1 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
                          syntaxTheme={syntaxTheme}
                        />
                      </div>
                    )}
                  </td>
                </tr>

                {/* Comments row */}
                {allComments.length > 0 && (
                  <tr className="bg-github-bg-secondary">
                    <td colSpan={4} className="p-0 border-t border-github-border">
                      {allComments.map((comment) => {
                        const layout = getCommentLayout(sideLine);
                        return (
                          <div
                            key={comment.id}
                            className={`flex ${
                              layout === 'left' ? 'justify-start'
                              : layout === 'right' ? 'justify-end'
                              : 'justify-center'
                            }`}
                          >
                            <div className={`${layout === 'full' ? 'w-full' : 'w-1/2'}`}>
                              <InlineComment
                                comment={comment}
                                onGeneratePrompt={onGeneratePrompt}
                                onRemoveComment={onRemoveComment}
                                onUpdateComment={onUpdateComment}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                )}

                {/* Comment form row */}
                {commentingLine &&
                  ((commentingLine === sideLine.oldLineNumber &&
                    sideLine.oldLine?.type === 'delete') ||
                    (commentingLine === sideLine.newLineNumber &&
                      (sideLine.newLine?.type === 'add' || sideLine.newLine?.type === 'normal')) ||
                    (Array.isArray(commentingLine) &&
                      (commentingLine[1] === sideLine.newLineNumber ||
                        commentingLine[1] === sideLine.oldLineNumber))) && (
                    <tr className="bg-github-bg-secondary">
                      <td colSpan={4} className="p-0 border-t border-github-border">
                        <div
                          className={`flex ${
                            getCommentLayout(sideLine) === 'left' ? 'justify-start'
                            : getCommentLayout(sideLine) === 'right' ? 'justify-end'
                            : 'justify-center'
                          }`}
                        >
                          <div
                            className={`${getCommentLayout(sideLine) === 'full' ? 'w-full' : 'w-1/2'}`}
                          >
                            <CommentForm
                              onSubmit={handleSubmitComment}
                              onCancel={handleCancelComment}
                            />
                          </div>
                        </div>
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
