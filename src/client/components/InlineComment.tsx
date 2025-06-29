import { useState } from 'react';
import { Comment } from '../../types/diff';
import { useComments } from './CommentContext';

interface InlineCommentProps {
  comment: Comment;
}

export function InlineComment({ comment }: InlineCommentProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { onGeneratePrompt } = useComments();

  const handleCopyPrompt = async () => {
    try {
      const prompt = await onGeneratePrompt(comment.id);
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

        <button
          onClick={handleCopyPrompt}
          className="text-xs px-2 py-1 bg-yellow-700/40 text-yellow-200 border border-yellow-600/50 rounded hover:bg-yellow-600/50 hover:border-yellow-500 transition-all whitespace-nowrap"
          title="Copy prompt for Claude Code"
        >
          {isCopied ? 'Copied!' : 'Copy Prompt'}
        </button>
      </div>

      <div className="text-yellow-100 text-sm leading-6 whitespace-pre-wrap">{comment.body}</div>
    </div>
  );
}
