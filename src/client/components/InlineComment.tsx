import { Check, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { type Comment } from '../../types/diff';

interface InlineCommentProps {
  comment: Comment;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function InlineComment({
  comment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
  onClick,
}: InlineCommentProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(comment.body);

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const prompt = onGeneratePrompt(comment);
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedBody(comment.body);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBody(comment.body);
  };

  const handleSaveEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editedBody.trim() !== comment.body) {
      onUpdateComment(comment.id, editedBody.trim());
    }
    setIsEditing(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveComment(comment.id);
  };

  // Keyboard shortcuts for editing
  useHotkeys(
    'escape',
    () => {
      if (isEditing) {
        handleCancelEdit();
      }
    },
    { enableOnFormTags: ['textarea'], enabled: isEditing },
    [isEditing]
  );

  useHotkeys(
    'mod+enter',
    () => {
      if (isEditing) {
        handleSaveEdit();
      }
    },
    { enableOnFormTags: ['textarea'], enabled: isEditing },
    [isEditing, editedBody, comment.body]
  );

  return (
    <div
      id={`comment-${comment.id}`}
      className={`p-3 bg-github-bg-tertiary border border-yellow-600/50 rounded-md border-l-4 border-l-yellow-400 shadow-sm transition-all ${
        onClick ? 'hover:shadow-md cursor-pointer' : ''
      }`}
      onClick={onClick}
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
                onClick={handleRemove}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="text-xs p-1.5 bg-github-bg-tertiary text-github-text-secondary border border-github-border rounded hover:text-github-text-primary hover:bg-github-bg-primary transition-all"
                title="Cancel editing"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      {!isEditing && <p className="text-sm text-github-text-primary">{comment.body}</p>}
      {isEditing && (
        <textarea
          className="w-full min-h-[80px] bg-github-bg-secondary border border-github-border rounded px-2 py-1.5 text-sm text-github-text-primary focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 resize-y"
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // Stop propagation to prevent triggering parent keyboard handlers
            e.stopPropagation();
          }}
        />
      )}
    </div>
  );
}
