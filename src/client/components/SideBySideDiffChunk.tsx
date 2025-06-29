import React, { useState } from 'react';
import { DiffChunk as DiffChunkType, DiffLine, Comment } from '../../types/diff';
import { CommentForm } from './CommentForm';
import styles from '../styles/SideBySideDiffChunk.module.css';

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
    setCommentingLine(lineNumber);
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
    return comments.filter(c => c.line === lineNumber);
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
    <div className={styles.chunk}>
      <table className={styles.sideBySideTable}>
        <thead>
          <tr>
            <th className={styles.lineNumber}>Old</th>
            <th className={styles.content}>Before</th>
            <th className={styles.lineNumber}>New</th>
            <th className={styles.content}>After</th>
          </tr>
        </thead>
        <tbody>
          {sideBySideLines.map((sideLine, index) => {
            const leftComments = sideLine.oldLineNumber ? getCommentsForLine(sideLine.oldLineNumber) : [];
            const rightComments = sideLine.newLineNumber ? getCommentsForLine(sideLine.newLineNumber) : [];
            const allComments = [...leftComments, ...rightComments];

            return (
              <React.Fragment key={index}>
                <tr className={styles.diffRow}>
                  {/* Old side */}
                  <td className={styles.lineNumber}>
                    {sideLine.oldLineNumber || ''}
                  </td>
                  <td className={`${styles.lineContent} ${
                    sideLine.oldLine?.type === 'delete' ? styles.deleted : 
                    sideLine.oldLine?.type === 'normal' ? styles.normal : styles.empty
                  }`}>
                    {sideLine.oldLine && (
                      <div className={styles.lineWrapper}>
                        <span className={styles.lineText}>
                          {sideLine.oldLine.content}
                        </span>
                        {sideLine.oldLineNumber && (
                          <button
                            className={styles.commentButton}
                            onClick={() => handleAddComment(sideLine.oldLineNumber!)}
                            title="Add comment"
                          >
                            💬
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* New side */}
                  <td className={styles.lineNumber}>
                    {sideLine.newLineNumber || ''}
                  </td>
                  <td className={`${styles.lineContent} ${
                    sideLine.newLine?.type === 'add' ? styles.added : 
                    sideLine.newLine?.type === 'normal' ? styles.normal : styles.empty
                  }`}>
                    {sideLine.newLine && (
                      <div className={styles.lineWrapper}>
                        <span className={styles.lineText}>
                          {sideLine.newLine.content}
                        </span>
                        {sideLine.newLineNumber && (
                          <button
                            className={styles.commentButton}
                            onClick={() => handleAddComment(sideLine.newLineNumber!)}
                            title="Add comment"
                          >
                            💬
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>

                {/* Comments row */}
                {allComments.length > 0 && (
                  <tr className={styles.commentRow}>
                    <td colSpan={4} className={styles.commentCell}>
                      {allComments.map(comment => (
                        <div key={comment.id} className={styles.existingComment}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentMeta}>
                              Line {comment.line} • {new Date(comment.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.commentBody}>{comment.body}</div>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}

                {/* Comment form row */}
                {(commentingLine === sideLine.oldLineNumber || commentingLine === sideLine.newLineNumber) && (
                  <tr className={styles.commentRow}>
                    <td colSpan={4} className={styles.commentCell}>
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