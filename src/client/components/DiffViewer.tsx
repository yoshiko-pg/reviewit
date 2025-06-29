import { useState } from 'react';
import { DiffFile, Comment } from '../../types/diff';
import { DiffChunk } from './DiffChunk';
import { InlineComment } from './InlineComment';
import { useComments } from './CommentContext';
import styles from '../styles/DiffViewer.module.css';

interface DiffViewerProps {
  file: DiffFile;
  comments: Comment[];
}

export function DiffViewer({ file, comments }: DiffViewerProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set([0]));
  const { onAddComment } = useComments();

  const toggleChunk = (index: number) => {
    setExpandedChunks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedChunks(new Set(file.chunks.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedChunks(new Set());
  };

  const getFileIcon = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return '🆕';
      case 'deleted':
        return '🗑️';
      case 'renamed':
        return '📝';
      default:
        return '📄';
    }
  };

  const handleAddComment = async (line: number, body: string) => {
    try {
      await onAddComment(file.path, line, body);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className={styles.diffViewer}>
      <div className={styles.fileHeader}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>{getFileIcon(file.status)}</span>
          <h2 className={styles.fileName}>{file.path}</h2>
          {file.oldPath && file.oldPath !== file.path && (
            <span className={styles.renamedFrom}>(renamed from {file.oldPath})</span>
          )}
        </div>

        <div className={styles.fileStats}>
          <span className={styles.additions}>+{file.additions}</span>
          <span className={styles.deletions}>-{file.deletions}</span>
          <span className={styles.status}>{file.status}</span>
        </div>

        <div className={styles.controls}>
          <button onClick={expandAll} className="btn-secondary">
            Expand All
          </button>
          <button onClick={collapseAll} className="btn-secondary">
            Collapse All
          </button>
        </div>
      </div>

      <div className={styles.chunks}>
        {file.chunks.map((chunk, index) => (
          <div key={index} className={styles.chunkContainer}>
            <div className={styles.chunkHeader} onClick={() => toggleChunk(index)}>
              <span className={styles.chunkToggle}>{expandedChunks.has(index) ? '▼' : '▶'}</span>
              <code className={styles.chunkInfo}>{chunk.header}</code>
            </div>

            {expandedChunks.has(index) && (
              <DiffChunk chunk={chunk} comments={comments} onAddComment={handleAddComment} />
            )}
          </div>
        ))}
      </div>

      <div className={styles.commentsSection}>
        {comments.length > 0 && (
          <div className={styles.commentsHeader}>
            <h3>Comments ({comments.length})</h3>
          </div>
        )}

        {comments.map((comment) => (
          <InlineComment key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
}
