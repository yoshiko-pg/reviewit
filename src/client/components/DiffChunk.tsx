import { MessageSquare } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import {
  type DiffChunk as DiffChunkType,
  type DiffLine,
  type Comment,
  type LineNumber,
} from '../../types/diff';

import { CommentForm } from './CommentForm';
import { InlineComment } from './InlineComment';
import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';
import type { AppearanceSettings } from './SettingsModal';
import { SideBySideDiffChunk } from './SideBySideDiffChunk';

interface DiffChunkProps {
  chunk: DiffChunkType;
  comments: Comment[];
  onAddComment: (line: LineNumber, body: string, codeContent?: string) => Promise<void>;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
  mode?: 'side-by-side' | 'inline';
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
}

export function DiffChunk({
  chunk,
  comments,
  onAddComment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  mode = 'inline',
  syntaxTheme,
}: DiffChunkProps) {
  const [startLine, setStartLine] = useState<number | null>(null);
  const [endLine, setEndLine] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [commentingLine, setCommentingLine] = useState<LineNumber | null>(null);
  const [commentingLineContent, setCommentingLineContent] = useState<string | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  // Global mouse up handler for drag selection
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setStartLine(null);
        setEndLine(null);
      };

      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
    return undefined;
  }, [isDragging]);

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

  const handleAddComment = (lineNumber: LineNumber, lineContent?: string) => {
    if (commentingLine === lineNumber) {
      setCommentingLine(null);
      setCommentingLineContent(null);
    } else {
      setCommentingLine(lineNumber);
      setCommentingLineContent(lineContent || null);
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
    return comments.filter((c) =>
      Array.isArray(c.line) ? c.line[1] === lineNumber : c.line === lineNumber
    );
  };

  const getCommentLayout = (line: DiffLine): 'left' | 'right' | 'full' => {
    // In inline mode, always use full width for comments
    if (mode === 'inline') {
      return 'full';
    }

    switch (line.type) {
      case 'delete':
        return 'left';
      case 'add':
        return 'right';
      default:
        return 'full';
    }
  };

  const getSelectedLineStyle = (lineNumber: number | undefined): string => {
    if (!lineNumber) {
      return '';
    }

    // Show selection during drag
    if (isDragging && startLine && endLine) {
      const min = Math.min(startLine, endLine);
      const max = Math.max(startLine, endLine);
      if (lineNumber >= min && lineNumber <= max) {
        let classes =
          'after:bg-blue-100 after:absolute after:inset-0 after:opacity-30 after:border-l-4 after:border-blue-500';
        // Add top border for first line
        if (lineNumber === min) {
          classes += ' after:border-t-2';
        }
        // Add bottom border for last line
        if (lineNumber === max) {
          classes += ' after:border-b-2';
        }
        return classes;
      }
    }

    // Show selection for existing comment
    if (commentingLine) {
      const start = Array.isArray(commentingLine) ? commentingLine[0] : commentingLine;
      const end = Array.isArray(commentingLine) ? commentingLine[1] : commentingLine;
      if (lineNumber >= start && lineNumber <= end) {
        return 'after:bg-diff-selected-bg after:absolute after:inset-0 after:border-l-5 after:border-l-diff-selected-border';
      }
    }

    return '';
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
        syntaxTheme={syntaxTheme}
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
                  className={`group ${getLineClass(line)} relative ${getSelectedLineStyle(
                    line.newLineNumber || line.oldLineNumber
                  )}`}
                  onMouseEnter={() => {
                    const lineNumber = line.newLineNumber || line.oldLineNumber;
                    if (lineNumber) {
                      setHoveredLine(lineNumber);
                    }
                  }}
                  onMouseLeave={() => setHoveredLine(null)}
                  onMouseMove={() => {
                    if (isDragging && startLine) {
                      const lineNumber = line.newLineNumber || line.oldLineNumber;
                      if (lineNumber) {
                        setEndLine(lineNumber);
                      }
                    }
                  }}
                >
                  <td className="w-[50px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top relative">
                    {line.oldLineNumber || ''}
                  </td>
                  <td className="w-[50px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top relative overflow-visible">
                    <span className="pr-5">{line.newLineNumber || ''}</span>
                    {hoveredLine === (line.newLineNumber || line.oldLineNumber) &&
                      (line.newLineNumber || line.oldLineNumber) && (
                        <button
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded transition-all duration-150 hover:scale-110 z-10"
                          style={{
                            backgroundColor: 'var(--color-yellow-btn-bg)',
                            color: 'var(--color-yellow-btn-text)',
                            border: '1px solid var(--color-yellow-btn-border)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'var(--color-yellow-btn-hover-bg)';
                            e.currentTarget.style.borderColor =
                              'var(--color-yellow-btn-hover-border)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-bg)';
                            e.currentTarget.style.borderColor = 'var(--color-yellow-btn-border)';
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const lineNumber = line.newLineNumber || line.oldLineNumber;
                            if (lineNumber) {
                              setStartLine(lineNumber);
                              setEndLine(lineNumber);
                              setIsDragging(true);
                            }
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            const lineNumber = line.newLineNumber || line.oldLineNumber;
                            if (!lineNumber || !startLine) {
                              setIsDragging(false);
                              setStartLine(null);
                              setEndLine(null);
                              return;
                            }

                            const actualEndLine = endLine || lineNumber;
                            if (startLine === actualEndLine) {
                              handleAddComment(lineNumber, line.content);
                            } else {
                              const min = Math.min(startLine, actualEndLine);
                              const max = Math.max(startLine, actualEndLine);
                              handleAddComment([min, max], line.content);
                            }

                            setIsDragging(false);
                            setStartLine(null);
                            setEndLine(null);
                          }}
                          title="Add a comment"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                  </td>
                  <td className="p-0 w-full relative align-top">
                    <div className="flex items-center relative min-h-[20px]">
                      <span
                        className={`w-5 text-center text-github-text-muted flex-shrink-0 bg-github-bg-secondary border-r border-github-border ${
                          line.type === 'add' ? 'text-github-accent bg-diff-addition-bg'
                          : line.type === 'delete' ? 'text-github-danger bg-diff-deletion-bg'
                          : ''
                        }`}
                      >
                        {getLinePrefix(line)}
                      </span>
                      <PrismSyntaxHighlighter
                        code={line.content}
                        className="flex-1 px-3 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word select-text [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
                        syntaxTheme={syntaxTheme}
                      />
                    </div>
                  </td>
                </tr>

                {lineComments.map((comment) => {
                  const layout = getCommentLayout(line);
                  return (
                    <tr key={comment.id} className="bg-github-bg-secondary">
                      <td colSpan={3} className="p-0 border-t border-github-border">
                        <div
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
                      </td>
                    </tr>
                  );
                })}

                {commentingLine &&
                  (commentingLine === (line.newLineNumber || line.oldLineNumber) ||
                    (Array.isArray(commentingLine) &&
                      commentingLine[1] === (line.newLineNumber || line.oldLineNumber))) && (
                    <tr className="bg-[var(--bg-secondary)]">
                      <td colSpan={3} className="p-0 border-t border-[var(--border-muted)]">
                        <div
                          className={`flex ${
                            getCommentLayout(line) === 'left' ? 'justify-start'
                            : getCommentLayout(line) === 'right' ? 'justify-end'
                            : 'justify-center'
                          }`}
                        >
                          <div
                            className={`${getCommentLayout(line) === 'full' ? 'w-full' : 'w-1/2'}`}
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
