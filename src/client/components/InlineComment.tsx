import { useState } from 'react';
import { Comment } from '../../types/diff';
import { useComments } from './CommentContext';
import styles from '../styles/InlineComment.module.css';

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
    <div className={styles.inlineComment}>
      <div className={styles.commentHeader}>
        <div className={styles.commentMeta}>
          <span className={styles.filePath}>{comment.file}</span>
          <span className={styles.lineNumber}>Line {comment.line}</span>
          <span className={styles.timestamp}>{new Date(comment.timestamp).toLocaleString()}</span>
        </div>

        <button
          onClick={handleCopyPrompt}
          className={`btn-secondary ${styles.copyButton}`}
          title="Copy prompt for Claude Code"
        >
          {isCopied ? '✅ Copied!' : '📋 Copy Prompt'}
        </button>
      </div>

      <div className={styles.commentBody}>{comment.body}</div>
    </div>
  );
}
