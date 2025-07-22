import { X, Check } from 'lucide-react';
import { useEffect } from 'react';

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
      <div className="relative bg-github-bg-primary border border-github-border rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-github-bg-primary border-b border-github-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-github-text-primary">All Comments</h2>
          <button
            onClick={onClose}
            className="text-github-text-secondary hover:text-github-text-primary transition-colors"
            aria-label="Close comments list"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
          {comments.length === 0 ?
            <p className="text-github-text-secondary text-center">No comments yet</p>
          : <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 bg-github-bg-tertiary border border-yellow-600/50 rounded-md border-l-4 border-l-yellow-400 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleCommentClick(comment)}
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2 text-xs text-github-text-secondary flex-1 min-w-0">
                      <span
                        className="font-mono px-1 py-0.5 rounded overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{
                          backgroundColor: 'var(--color-yellow-path-bg)',
                          color: 'var(--color-yellow-path-text)',
                        }}
                      >
                        {comment.file}:{formatLineNumber(comment.line).replace(/L/g, '')}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteComment(e, comment.id)}
                      className="text-xs p-1.5 bg-github-bg-tertiary text-green-600 border border-github-border rounded hover:bg-green-500/10 hover:border-green-600 transition-all"
                      title="Resolve"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                  <div className="text-github-text-primary text-sm leading-6 whitespace-pre-wrap">
                    {comment.body}
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
