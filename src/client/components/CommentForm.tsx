import React, { useState } from 'react';
import styles from '../styles/CommentForm.module.css';

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
}

export function CommentForm({ onSubmit, onCancel }: CommentFormProps) {
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form className={styles.commentForm} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <span className={styles.formTitle}>Add a comment</span>
        <span className={styles.formHint}>Cmd+Enter to submit • Escape to cancel</span>
      </div>

      <textarea
        className={styles.commentInput}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Leave a comment..."
        rows={3}
        autoFocus
        disabled={isSubmitting}
      />

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!body.trim() || isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </button>
      </div>
    </form>
  );
}
