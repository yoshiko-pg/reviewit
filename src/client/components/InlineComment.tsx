import { useState } from 'react';
import { Comment } from '../../types/diff';
import { Trash2 } from 'lucide-react';

interface InlineCommentProps {
  comment: Comment;
  onGeneratePrompt: (comment: Comment) => string;
  onRemoveComment: (commentId: string) => void;
}

export function InlineComment({ comment, onGeneratePrompt, onRemoveComment }: InlineCommentProps) {
  const [isCopied, setIsCopied] = useState(false);

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
          <button
            onClick={handleCopyPrompt}
            className="text-xs px-2 py-1 bg-yellow-700/40 text-yellow-200 border border-yellow-600/50 rounded hover:bg-yellow-600/50 hover:border-yellow-500 transition-all whitespace-nowrap"
            title="Copy prompt for Claude Code"
          >
            {isCopied ? 'Copied!' : 'Copy Prompt'}
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
        </div>
      </div>

      <div className="text-yellow-100 text-sm leading-6 whitespace-pre-wrap">{comment.body}</div>
    </div>
  );
}
