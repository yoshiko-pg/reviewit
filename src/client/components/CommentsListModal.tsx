import { X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const commentRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleCommentClick = useCallback(
    (comment: Comment) => {
      onNavigate(comment);
      onClose();
    },
    [onNavigate, onClose]
  );

  const handleDeleteComment = useCallback(
    (comment: Comment) => {
      if (confirm(`Delete this comment?\n\n"${comment.body}"`)) {
        onRemoveComment(comment.id);
        // Adjust selected index if needed
        if (selectedIndex >= comments.length - 1 && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        }
      }
    },
    [onRemoveComment, selectedIndex, comments.length]
  );
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedIndex(0);
      setEditingCommentId(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if editing
      if (editingCommentId) {
        if (e.key === 'Escape') {
          setEditingCommentId(null);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, comments.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (comments[selectedIndex]) {
            handleCommentClick(comments[selectedIndex]);
          }
          break;
        case 'c':
          e.preventDefault();
          if (comments[selectedIndex]) {
            setEditingCommentId(comments[selectedIndex].id);
          }
          break;
        case 'd':
          e.preventDefault();
          if (comments[selectedIndex]) {
            handleDeleteComment(comments[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    onClose,
    selectedIndex,
    comments,
    editingCommentId,
    handleCommentClick,
    handleDeleteComment,
  ]);

  // Scroll selected comment into view
  useEffect(() => {
    if (commentRefs.current[selectedIndex]) {
      commentRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-github-bg-primary border border-github-border rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-github-bg-primary border-b border-github-border px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-github-text-primary">All Comments</h2>
            <button
              onClick={onClose}
              className="text-github-text-secondary hover:text-github-text-primary transition-colors"
              aria-label="Close comments list"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-xs text-github-text-secondary">
            <span className="font-mono">j/k</span> or <span className="font-mono">↑/↓</span> to
            navigate • <span className="font-mono">Enter</span> to jump •{' '}
            <span className="font-mono">c</span> to edit • <span className="font-mono">d</span> to
            delete • <span className="font-mono">Esc</span> to close
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="p-6">
            {comments.length === 0 ?
              <p className="text-github-text-secondary text-center">No comments yet</p>
            : <>
                <div className="space-y-2">
                  {comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      ref={(el) => {
                        commentRefs.current[index] = el;
                      }}
                      className={`${selectedIndex === index ? 'ring-2 ring-blue-500 rounded' : ''}`}
                    >
                      <InlineComment
                        comment={comment}
                        onGeneratePrompt={onGeneratePrompt}
                        onRemoveComment={onRemoveComment}
                        onUpdateComment={(id, body) => {
                          onUpdateComment(id, body);
                          setEditingCommentId(null);
                        }}
                        onClick={() => {
                          setSelectedIndex(index);
                          handleCommentClick(comment);
                        }}
                        isClickable={true}
                        isEditing={editingCommentId === comment.id}
                        onStartEdit={() => setEditingCommentId(comment.id)}
                        onCancelEdit={() => setEditingCommentId(null)}
                      />
                    </div>
                  ))}
                </div>
                {comments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-github-border text-xs text-github-text-secondary text-center">
                    {selectedIndex + 1} of {comments.length} comments
                  </div>
                )}
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
