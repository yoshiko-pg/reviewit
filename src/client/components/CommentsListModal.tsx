import { X, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import type { Comment } from '../../types/diff';
import { useLocalComments } from '../hooks/useLocalComments';

interface CommentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (comment: Comment) => void;
  commitHash?: string;
}

export function CommentsListModal({
  isOpen,
  onClose,
  onNavigate,
  commitHash,
}: CommentsListModalProps) {
  const { comments, removeComment } = useLocalComments(commitHash);

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
    removeComment(commentId);
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
      <div className="relative bg-slate-800 rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Comments List</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close comments list"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {comments.length === 0 ?
            <p className="text-slate-400 text-center">No comments yet</p>
          : <div className="space-y-6">
              {Object.entries(commentsByFile).map(([file, fileComments]) => (
                <div key={file}>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">{file}</h3>
                  <div className="space-y-2">
                    {fileComments.map((comment) => (
                      <button
                        key={comment.id}
                        onClick={() => handleCommentClick(comment)}
                        className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-400 font-mono">
                              {formatLineNumber(comment.line)}
                            </span>
                            <p className="text-sm text-white mt-1 break-words">{comment.body}</p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteComment(e, comment.id)}
                            className="ml-2 p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
