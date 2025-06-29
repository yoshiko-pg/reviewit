import { DiffFile, Comment } from '../../types/diff';
import styles from '../styles/FileList.module.css';

interface FileListProps {
  files: DiffFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  comments: Comment[];
}

export function FileList({ files, selectedFile, onSelectFile, comments }: FileListProps) {
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
            <div
              key={file.path}
              className={`${styles.file} ${selectedFile === file.path ? styles.selected : ''}`}
              onClick={() => onSelectFile(file.path)}
            >
              <div className={styles.fileHeader}>
                <span className={styles.fileIcon}>{getFileIcon(file.status)}</span>
                <span className={styles.fileName} title={file.path}>
                  {file.path.split('/').pop()}
                </span>
                {commentCount > 0 && <span className={styles.commentBadge}>💬 {commentCount}</span>}
              </div>

              <div className={styles.filePath}>{file.path}</div>

              <div className={styles.fileStats}>
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
