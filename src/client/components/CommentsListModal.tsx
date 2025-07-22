import { X, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import type { Comment } from '../../types/diff';

interface CommentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (comment: Comment) => void;
  comments: Comment[];
  onRemoveComment: (commentId: string) => void;
}

export function CommentsListModal({
  isOpen,
  onClose,
  onNavigate,
  comments,
  onRemoveComment,
}: CommentsListModalProps) {
  // Group comments by file
  const commentsByFile = useMemo(() => {
    const grouped: Record<string, Comment[]> = {};
    comments.forEach((comment) => {
      const fileGroup = grouped[comment.file] || [];
      fileGroup.push(comment);
      grouped[comment.file] = fileGroup;
    });
    return grouped;
  }, [comments]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCommentClick = (comment: Comment) => {
    onNavigate(comment);
    onClose();
  };

  const handleDeleteComment = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    onRemoveComment(commentId);
  };

  const formatLineNumber = (line: number | [number, number]) => {
    if (Array.isArray(line)) {
      return `L${line[0]}-L${line[1]}`;
    }
    return `L${line}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-github-bg-primary border border-github-border rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-github-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-github-text-primary">Comments List</h2>
            <button
              onClick={onClose}
              className="text-github-text-secondary hover:text-github-text-primary transition-colors"
              aria-label="Close comments list"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {comments.length === 0 ?
            <p className="text-github-text-secondary text-center">No comments yet</p>
          : <div className="space-y-6">
              {Object.entries(commentsByFile).map(([file, fileComments]) => (
                <div key={file}>
                  <h3 className="text-sm font-medium text-github-text-secondary mb-3">{file}</h3>
                  <div className="space-y-2">
                    {fileComments.map((comment) => (
                      <button
                        key={comment.id}
                        onClick={() => handleCommentClick(comment)}
                        className="w-full text-left p-3 bg-github-bg-secondary hover:bg-github-bg-tertiary rounded-md transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-github-text-secondary font-mono">
                              {formatLineNumber(comment.line)}
                            </span>
                            <p className="text-sm text-github-text-primary mt-1 break-words">
                              {comment.body}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteComment(e, comment.id)}
                            className="ml-2 p-1 text-github-text-secondary hover:text-github-danger opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Delete comment: ${comment.body}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
