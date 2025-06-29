import { DiffFile, Comment } from '../../types/diff';

interface FileListProps {
  files: DiffFile[];
  onScrollToFile: (path: string) => void;
  comments: Comment[];
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
}

export function FileList({
  files,
  onScrollToFile,
  comments,
  reviewedFiles,
  onToggleReviewed,
}: FileListProps) {
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
        return 'text-github-accent';
      case 'deleted':
        return 'text-github-danger';
      case 'renamed':
        return 'text-github-warning';
      default:
        return 'text-github-text-muted';
    }
  };

  const getCommentCount = (filePath: string) => {
    return comments.filter((c) => c.file === filePath).length;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-github-border bg-github-bg-tertiary">
        <h3 className="text-sm font-semibold text-github-text-primary m-0">
          Files changed ({files.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.map((file) => {
          const commentCount = getCommentCount(file.path);

          return (
            <div
              key={file.path}
              className={`px-4 py-3 border-b border-github-border cursor-pointer transition-colors hover:bg-github-bg-tertiary ${
                reviewedFiles.has(file.path) ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 mr-1 cursor-pointer accent-github-accent"
                  checked={reviewedFiles.has(file.path)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleReviewed(file.path);
                  }}
                  title={reviewedFiles.has(file.path) ? 'Mark as not reviewed' : 'Mark as reviewed'}
                />
                <span className="text-xs">{getFileIcon(file.status)}</span>
                <span
                  className={`font-medium text-github-text-primary flex-1 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer ${
                    reviewedFiles.has(file.path) ? 'line-through text-github-text-muted' : ''
                  }`}
                  title={file.path}
                  onClick={() => onScrollToFile(file.path)}
                >
                  {file.path.split('/').pop()}
                </span>
                {commentCount > 0 && (
                  <span className="bg-yellow-100 text-github-warning text-xs px-1.5 py-0.5 rounded-full font-medium">
                    💬 {commentCount}
                  </span>
                )}
              </div>

              <div
                className="text-xs text-github-text-muted mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                onClick={() => onScrollToFile(file.path)}
              >
                {file.path}
              </div>

              <div
                className="flex items-center gap-2 text-xs cursor-pointer"
                onClick={() => onScrollToFile(file.path)}
              >
                <span className="font-medium px-1 py-0.5 rounded text-github-accent bg-green-100/10">
                  +{file.additions}
                </span>
                <span className="font-medium px-1 py-0.5 rounded text-github-danger bg-red-100/10">
                  -{file.deletions}
                </span>
                <span className={`text-xs uppercase tracking-wide ${getStatusClass(file.status)}`}>
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
