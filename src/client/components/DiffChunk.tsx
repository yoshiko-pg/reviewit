import React, { useState } from 'react';
import { DiffChunk as DiffChunkType, DiffLine, Comment } from '../../types/diff';
import { CommentForm } from './CommentForm';
import { SideBySideDiffChunk } from './SideBySideDiffChunk';
import styles from '../styles/DiffChunk.module.css';

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
        return styles.added;
      case 'delete':
        return styles.deleted;
      default:
        return styles.normal;
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
    return comments.filter((c) => c.line === lineNumber);
  };

  // Use side-by-side component for side-by-side mode
  if (mode === 'side-by-side') {
    return (
      <SideBySideDiffChunk 
        chunk={chunk}
        comments={comments}
        onAddComment={onAddComment}
      />
    );
  }

  return (
    <div className={styles.chunk}>
      <table className={styles.diffTable}>
        <tbody>
          {chunk.lines.map((line, index) => {
            const lineComments = getCommentsForLine(line.newLineNumber || line.oldLineNumber || 0);

            return (
              <React.Fragment key={index}>
                <tr className={`${styles.diffLine} ${getLineClass(line)}`}>
                  <td className={styles.lineNumber}>{line.oldLineNumber || ''}</td>
                  <td className={styles.lineNumber}>{line.newLineNumber || ''}</td>
                  <td className={styles.lineContent}>
                    <div className={styles.lineWrapper}>
                      <span className={styles.linePrefix}>{getLinePrefix(line)}</span>
                      <span className={styles.lineText}>{line.content}</span>
                      <button
                        className={styles.commentButton}
                        onClick={() =>
                          handleAddComment(line.newLineNumber || line.oldLineNumber || 0)
                        }
                        title="Add comment"
                      >
                        💬
                      </button>
                    </div>
                  </td>
                </tr>

                {lineComments.map((comment) => (
                  <tr key={comment.id} className={styles.commentRow}>
                    <td colSpan={3} className={styles.commentCell}>
                      <div className={styles.existingComment}>
                        <div className={styles.commentHeader}>
                          <span className={styles.commentMeta}>
                            Line {comment.line} • {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.commentBody}>{comment.body}</div>
                      </div>
                    </td>
                  </tr>
                ))}

                {commentingLine === (line.newLineNumber || line.oldLineNumber) && (
                  <tr className={styles.commentRow}>
                    <td colSpan={3} className={styles.commentCell}>
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
