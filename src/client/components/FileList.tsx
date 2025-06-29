import { DiffFile, Comment } from '../../types/diff';
import styles from '../styles/FileList.module.css';

interface FileListProps {
  files: DiffFile[];
  onScrollToFile: (path: string) => void;
  comments: Comment[];
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
}

export function FileList({ files, onScrollToFile, comments, reviewedFiles, onToggleReviewed }: FileListProps) {
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

  const getStatusClass = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return styles.added;
      case 'deleted':
        return styles.deleted;
      case 'renamed':
        return styles.renamed;
      default:
        return styles.modified;
    }
  };

  const getCommentCount = (filePath: string) => {
    return comments.filter((c) => c.file === filePath).length;
  };

  return (
    <div className={styles.fileList}>
      <div className={styles.header}>
        <h3>Files changed ({files.length})</h3>
      </div>

      <div className={styles.files}>
        {files.map((file) => {
          const commentCount = getCommentCount(file.path);

          return (
            <div key={file.path} className={`${styles.file} ${reviewedFiles.has(file.path) ? styles.reviewed : ''}`}>
              <div className={styles.fileHeader}>
                <input
                  type="checkbox"
                  className={styles.reviewedCheckbox}
                  checked={reviewedFiles.has(file.path)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleReviewed(file.path);
                  }}
                  title={reviewedFiles.has(file.path) ? 'Mark as not reviewed' : 'Mark as reviewed'}
                />
                <span className={styles.fileIcon}>{getFileIcon(file.status)}</span>
                <span className={styles.fileName} title={file.path} onClick={() => onScrollToFile(file.path)}>
                  {file.path.split('/').pop()}
                </span>
                {commentCount > 0 && <span className={styles.commentBadge}>💬 {commentCount}</span>}
              </div>

              <div className={styles.filePath} onClick={() => onScrollToFile(file.path)}>{file.path}</div>

              <div className={styles.fileStats} onClick={() => onScrollToFile(file.path)}>
                <span className={`${styles.stat} ${styles.additions}`}>+{file.additions}</span>
                <span className={`${styles.stat} ${styles.deletions}`}>-{file.deletions}</span>
                <span className={`${styles.status} ${getStatusClass(file.status)}`}>
                  {file.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
