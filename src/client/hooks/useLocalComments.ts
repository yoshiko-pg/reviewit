import { useState, useEffect } from 'react';

import { type Comment } from '../../types/diff';

export function useLocalComments(commitHash?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const storageKey = commitHash ? `reviewit-comments-${commitHash}` : 'reviewit-comments';

  // Load comments from localStorage on mount
  useEffect(() => {
    const savedComments = localStorage.getItem(storageKey);
    if (savedComments) {
      try {
        setComments(JSON.parse(savedComments));
      } catch (error) {
        console.error('Failed to parse saved comments:', error);
      }
    }
  }, [storageKey]);

  // Save comments to localStorage whenever comments change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(comments));
  }, [comments, storageKey]);

  const addComment = (file: string, line: number, body: string, codeContent?: string): Comment => {
    console.log('Adding comment with codeContent:', codeContent);
    const comment: Comment = {
      id: `${file}:${line}:${Date.now()}`,
      file,
      line,
      body,
      timestamp: new Date().toISOString(),
      codeContent,
    };

    setComments((prev) => [...prev, comment]);
    return comment;
  };

  const removeComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const updateComment = (commentId: string, newBody: string) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: newBody } : c)));
  };

  const clearAllComments = () => {
    setComments([]);
    localStorage.removeItem(storageKey);
  };

  const generatePrompt = (comment: Comment): string => {
    console.log('Generating prompt for comment:', comment);
    const parts = [`File: ${comment.file}`, `Line: ${comment.line}`];

    if (comment.codeContent) {
      parts.push('', 'Code Context:', '```', comment.codeContent, '```');
    } else {
      console.log('No codeContent found for comment:', comment.id);
    }

    parts.push(`Comment: ${comment.body}`);
    return parts.join('\n');
  };

  const generateAllCommentsPrompt = (): string => {
    if (comments.length === 0) {
      return 'No comments available.';
    }

    const prompts = comments.map((comment, index) => {
      const individualPrompt = generatePrompt(comment);
      return [`## Comment ${index + 1}`, individualPrompt].join('\n');
    });

    return [
      `All Code Review Comments (${comments.length} total)`,
      '='.repeat(50),
      '',
      ...prompts,
    ].join('\n\n');
  };

  return {
    comments,
    addComment,
    removeComment,
    updateComment,
    clearAllComments,
    generatePrompt,
    generateAllCommentsPrompt,
  };
}
