import { Trash2, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';

import { type Comment } from '../../types/diff';

interface InlineCommentProps {
  comment: Comment;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newBody: string) => void;
}

export function InlineComment({
  comment,
  onGeneratePrompt,
  onRemoveComment,
  onUpdateComment,
}: InlineCommentProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(comment.body);

  const handleCopyPrompt = async () => {
    try {
      const prompt = onGeneratePrompt(comment);
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedBody(comment.body);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBody(comment.body);
  };

  const handleSaveEdit = () => {
    if (editedBody.trim() !== comment.body) {
      onUpdateComment(comment.id, editedBody.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="m-2 mx-4 p-3 bg-github-bg-tertiary border border-yellow-600/50 rounded-md border-l-4 border-l-yellow-400 shadow-sm">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-github-text-secondary flex-1 min-w-0">
          <span
            className="font-mono px-1 py-0.5 rounded overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              backgroundColor: 'var(--color-yellow-path-bg)',
              color: 'var(--color-yellow-path-text)',
            }}
          >
            {comment.file}:{comment.line}
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
                title="Copy prompt for Claude Code"
              >
                {isCopied ? 'Copied!' : 'Copy Prompt'}
              </button>
              <button
                onClick={handleStartEdit}
                className="text-xs p-1.5 bg-github-bg-tertiary text-github-text-secondary border border-github-border rounded hover:text-github-text-primary hover:bg-github-bg-primary transition-all"
                title="Edit comment"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this comment?')) {
                    onRemoveComment(comment.id);
                  }
                }}
                className="text-xs p-1.5 bg-github-bg-tertiary text-github-danger border border-github-border rounded hover:bg-red-500/10 hover:border-github-danger transition-all"
                title="Delete comment"
              >
                <Trash2 size={12} />
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
