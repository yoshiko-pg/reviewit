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
    <div className="m-2 mx-4 p-3 bg-github-bg-tertiary border border-github-border rounded-md border-l-4 border-l-blue-600">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-github-text-muted flex-1 min-w-0">
          <span className="font-mono bg-github-bg-secondary px-1 py-0.5 rounded text-github-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
            {comment.file}
          </span>
          <span className="bg-github-bg-secondary px-1 py-0.5 rounded text-github-text-secondary font-medium">
            Line {comment.line}
          </span>
          <span className="text-github-text-muted">
            {new Date(comment.timestamp).toLocaleString()}
          </span>
        </div>

        <button
          onClick={handleCopyPrompt}
          className="text-xs px-2 py-1 bg-github-bg-tertiary text-github-text-primary border border-github-border rounded hover:bg-blue-100/10 hover:border-blue-600 transition-all whitespace-nowrap"
          title="Copy prompt for Claude Code"
        >
          {isCopied ? '✅ Copied!' : '📋 Copy Prompt'}
        </button>
      </div>

      <div className="text-github-text-primary text-sm leading-6 whitespace-pre-wrap">
        {comment.body}
      </div>
    </div>
  );
}
