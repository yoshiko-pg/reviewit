import { useState, useEffect } from 'react';
import { DiffFile, Comment } from '../../types/diff';
import { DiffChunk } from './DiffChunk';
import { useComments } from './CommentContext';
import { setCurrentFilename } from './PrismSyntaxHighlighter';
import styles from '../styles/DiffViewer.module.css';

interface DiffViewerProps {
  file: DiffFile;
  comments: Comment[];
  diffMode: 'side-by-side' | 'inline';
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
}

export function DiffViewer({ file, comments, diffMode, reviewedFiles, onToggleReviewed }: DiffViewerProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set([0]));
  const { onAddComment } = useComments();

  // シンタックスハイライター用にファイル名をセット
  useEffect(() => {
    setCurrentFilename(file.path);
  }, [file.path]);

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

        <div className={styles.fileActions}>
          <input
            type="checkbox"
            className={styles.viewedCheckbox}
            checked={reviewedFiles.has(file.path)}
            onChange={() => onToggleReviewed(file.path)}
            title={reviewedFiles.has(file.path) ? 'Mark as not reviewed' : 'Mark as reviewed'}
          />
          <span className={styles.viewedLabel}>Viewed</span>
          <button
            className={styles.copyButton}
            onClick={() => {
              navigator.clipboard.writeText(file.path)
                .then(() => {
                  console.log('File path copied to clipboard:', file.path);
                })
                .catch(err => {
                  console.error('Failed to copy file path:', err);
                });
            }}
            title="Copy file path"
          >
            📋
          </button>
          <button className={styles.menuButton} title="More options">
            ⋯
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.chunkControls}>
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
              <DiffChunk
                chunk={chunk}
                comments={comments}
                onAddComment={handleAddComment}
                mode={diffMode}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
