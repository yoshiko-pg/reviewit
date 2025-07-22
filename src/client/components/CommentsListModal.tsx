import { X } from 'lucide-react';
import { useEffect } from 'react';

import type { Comment } from '../../types/diff';

import { InlineComment } from './InlineComment';

interface CommentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (comment: Comment) => void;
  comments: Comment[];
  onRemoveComment: (commentId: string) => void;
  onGeneratePrompt: (comment: Comment) => string;
  onUpdateComment: (commentId: string, newBody: string) => void;
}

export function CommentsListModal({
  isOpen,
  onClose,
  onNavigate,
  comments,
  onRemoveComment,
  onGeneratePrompt,
  onUpdateComment,
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
          : <div className="space-y-0">
              {comments.map((comment) => (
                <InlineComment
                  key={comment.id}
                  comment={comment}
                  onGeneratePrompt={onGeneratePrompt}
                  onRemoveComment={onRemoveComment}
                  onUpdateComment={onUpdateComment}
                  onClick={() => handleCommentClick(comment)}
                  isClickable={true}
                />
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
