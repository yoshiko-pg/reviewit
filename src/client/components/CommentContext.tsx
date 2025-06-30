import { createContext, useContext, type ReactNode } from 'react';

import { type Comment } from '../../types/diff';

interface CommentContextType {
  comments: Comment[];
  onAddComment: (file: string, line: number, body: string) => Promise<Comment>;
  onGeneratePrompt: (commentId: string) => Promise<string>;
}

const CommentContext = createContext<CommentContextType | undefined>(undefined);

interface CommentProviderProps {
  children: ReactNode;
  comments: Comment[];
  onAddComment: (file: string, line: number, body: string) => Promise<Comment>;
  onGeneratePrompt: (commentId: string) => Promise<string>;
}

export function CommentProvider({
  children,
  comments,
  onAddComment,
  onGeneratePrompt,
}: CommentProviderProps) {
  return (
    <CommentContext.Provider value={{ comments, onAddComment, onGeneratePrompt }}>
      {children}
    </CommentContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentContext);
  if (context === undefined) {
    throw new Error('useComments must be used within a CommentProvider');
  }
  return context;
}
