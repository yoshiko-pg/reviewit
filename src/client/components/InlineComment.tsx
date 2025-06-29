import { useState } from 'react';
import { Comment } from '../../types/diff';
import { Trash2, Edit2, Save, X } from 'lucide-react';

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
    <div className="m-2 mx-4 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-md border-l-4 border-l-yellow-400 shadow-sm">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-300 flex-1 min-w-0">
          <span className="font-mono bg-yellow-800/30 px-1 py-0.5 rounded text-yellow-200 overflow-hidden text-ellipsis whitespace-nowrap">
            {comment.file}
          </span>
          <span className="bg-yellow-800/30 px-1 py-0.5 rounded text-yellow-200 font-medium">
            Line {comment.line}
          </span>
          <span className="text-gray-400">{new Date(comment.timestamp).toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleCopyPrompt}
                className="text-xs px-2 py-1 bg-yellow-700/40 text-yellow-200 border border-yellow-600/50 rounded hover:bg-yellow-600/50 hover:border-yellow-500 transition-all whitespace-nowrap"
                title="Copy prompt for Claude Code"
              >
                {isCopied ? 'Copied!' : 'Copy Prompt'}
              </button>
              <button
                onClick={handleStartEdit}
                className="text-xs p-1.5 bg-blue-700/40 text-blue-200 border border-blue-600/50 rounded hover:bg-blue-600/50 hover:border-blue-500 transition-all"
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
                className="text-xs p-1.5 bg-red-700/40 text-red-200 border border-red-600/50 rounded hover:bg-red-600/50 hover:border-red-500 transition-all"
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
                className="text-xs p-1.5 bg-green-700/40 text-green-200 border border-green-600/50 rounded hover:bg-green-600/50 hover:border-green-500 transition-all"
                title="Save changes"
              >
                <Save size={12} />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs p-1.5 bg-gray-700/40 text-gray-200 border border-gray-600/50 rounded hover:bg-gray-600/50 hover:border-gray-500 transition-all"
                title="Cancel editing"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="text-yellow-100 text-sm leading-6 whitespace-pre-wrap">{comment.body}</div>
      ) : (
        <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          className="w-full text-yellow-100 text-sm leading-6 bg-yellow-900/20 border border-yellow-600/50 rounded px-2 py-1 resize-none focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          rows={Math.max(2, editedBody.split('\n').length)}
          placeholder="Edit your comment..."
          autoFocus
        />
      )}
    </div>
  );
}
