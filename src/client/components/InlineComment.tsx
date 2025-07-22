import { Check, Edit2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { type Comment } from '../../types/diff';

interface InlineCommentProps {
  comment: Comment;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
  onClick?: () => void;
  isClickable?: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
}

export function InlineComment({
  comment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  onClick,
  isClickable = false,
  isEditing: externalIsEditing,
  onStartEdit,
  onCancelEdit,
}: InlineCommentProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(comment.body);

  // Use external editing state if provided, otherwise use internal state
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;

  const handleCopyPrompt = async (e?: React.MouseEvent) => {
    if (e && isClickable) {
      e.stopPropagation();
    }
    try {
      const prompt = onGeneratePrompt(comment);
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleStartEdit = (e?: React.MouseEvent) => {
    if (e && isClickable) {
      e.stopPropagation();
    }
    if (onStartEdit) {
      onStartEdit();
    } else {
      setInternalIsEditing(true);
    }
    setEditedBody(comment.body);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e && isClickable) {
      e.stopPropagation();
    }
    if (onCancelEdit) {
      onCancelEdit();
    } else {
      setInternalIsEditing(false);
    }
    setEditedBody(comment.body);
  };

  const handleSaveEdit = (e?: React.MouseEvent) => {
    if (e && isClickable) {
      e.stopPropagation();
    }
    if (editedBody.trim() !== comment.body) {
      onUpdateComment(comment.id, editedBody.trim());
    }
    if (onCancelEdit) {
      onCancelEdit(); // Use onCancelEdit to close external editing state
    } else {
      setInternalIsEditing(false);
    }
  };

  // Update edited body when isEditing changes to true
  useEffect(() => {
    if (isEditing) {
      setEditedBody(comment.body);
    }
  }, [isEditing, comment.body]);

  return (
    <div
      id={`comment-${comment.id}`}
      className={`m-2 mx-4 p-3 bg-github-bg-tertiary border border-yellow-600/50 rounded-md border-l-4 border-l-yellow-400 shadow-sm transition-all ${
        isClickable ? 'hover:shadow-md cursor-pointer' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
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
            {comment.file}:
            {Array.isArray(comment.line) ? `${comment.line[0]}-${comment.line[1]}` : comment.line}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleCopyPrompt}
                className="text-xs px-2 py-1 rounded transition-all whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--color-yellow-btn-bg)',
                  color: 'var(--color-yellow-btn-text)',
                  border: '1px solid var(--color-yellow-btn-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-hover-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-yellow-btn-hover-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-yellow-btn-border)';
                }}
                title="Copy prompt for AI coding agent"
              >
                {isCopied ? 'Copied!' : 'Copy Prompt'}
              </button>
              <button
                onClick={handleStartEdit}
                className="text-xs p-1.5 bg-github-bg-tertiary text-github-text-secondary border border-github-border rounded hover:text-github-text-primary hover:bg-github-bg-primary transition-all"
                title="Edit"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  if (isClickable) {
                    e.stopPropagation();
                  }
                  onRemoveComment(comment.id);
                }}
                className="text-xs p-1.5 bg-github-bg-tertiary text-green-600 border border-github-border rounded hover:bg-green-500/10 hover:border-green-600 transition-all"
                title="Resolve"
              >
                <Check size={12} />
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSaveEdit}
                className="text-xs p-1.5 bg-github-accent text-white border border-github-accent rounded hover:opacity-80 transition-all"
                title="Save changes"
              >
                <Save size={12} />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs p-1.5 bg-github-bg-tertiary text-github-text-secondary border border-github-border rounded hover:text-github-text-primary hover:bg-github-bg-primary transition-all"
                title="Cancel editing"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditing ?
        <div className="text-github-text-primary text-sm leading-6 whitespace-pre-wrap">
          {comment.body}
        </div>
      : <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          className="w-full text-github-text-primary text-sm leading-6 bg-github-bg-secondary border border-github-border rounded px-2 py-1 resize-none focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30"
          rows={Math.max(2, editedBody.split('\n').length)}
          placeholder="Edit your comment..."
          autoFocus
        />
      }
    </div>
  );
}
