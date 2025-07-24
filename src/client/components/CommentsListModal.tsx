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
  const commentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sort comments by file path and line number
  const sortedComments = [...comments].sort((a, b) => {
    // First sort by file path
    const fileCompare = a.file.localeCompare(b.file);
    if (fileCompare !== 0) return fileCompare;

    // Then sort by line number
    const aLine = Array.isArray(a.line) ? a.line[0] : a.line;
    const bLine = Array.isArray(b.line) ? b.line[0] : b.line;
    return aLine - bLine;
  });

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
        if (selectedIndex >= sortedComments.length - 1 && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        }
      }
    },
    [onRemoveComment, selectedIndex, sortedComments.length]
  );
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, sortedComments.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (sortedComments[selectedIndex]) {
            handleCommentClick(sortedComments[selectedIndex]);
          }
          break;
        case 'd':
          e.preventDefault();
          if (sortedComments[selectedIndex]) {
            handleDeleteComment(sortedComments[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedIndex, sortedComments, handleCommentClick, handleDeleteComment]);

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
            <span className="font-mono">d</span> to delete • <span className="font-mono">Esc</span>{' '}
            to close
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="p-6">
            {sortedComments.length === 0 ?
              <p className="text-github-text-secondary text-center">No comments yet</p>
            : <>
                <div className="space-y-2">
                  {sortedComments.map((comment, index) => (
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
                        onUpdateComment={onUpdateComment}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(index);
                          handleCommentClick(comment);
                        }}
                      />
                    </div>
                  ))}
                </div>
                {sortedComments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-github-border text-xs text-github-text-secondary text-center">
                    {selectedIndex + 1} of {sortedComments.length} comments
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
