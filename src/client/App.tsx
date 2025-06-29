import { useState, useEffect } from 'react';
import { DiffResponse, Comment } from '../types/diff';
import { FileList } from './components/FileList';
import { DiffViewer } from './components/DiffViewer';
import { CommentProvider } from './components/CommentContext';
import styles from './styles/App.module.css';

function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiffData();
    fetchComments();
  }, []);

  const fetchDiffData = async () => {
    try {
      const response = await fetch('/api/diff');
      if (!response.ok) throw new Error('Failed to fetch diff data');
      const data = await response.json();
      setDiffData(data);
      if (data.files.length > 0) {
        setSelectedFile(data.files[0].path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch('/api/comments');
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.warn('Failed to fetch comments:', err);
    }
  };

  const addComment = async (file: string, line: number, body: string) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, line, body }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const newComment = await response.json();
      setComments((prev) => [...prev, newComment]);
      return newComment;
    } catch (err) {
      console.error('Failed to add comment:', err);
      throw err;
    }
  };

  const generatePrompt = async (commentId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/comments/${commentId}/prompt`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to generate prompt');

      const { prompt } = await response.json();
      return prompt;
    } catch (err) {
      console.error('Failed to generate prompt:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}>Loading diff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!diffData) {
    return (
      <div className={styles.error}>
        <h2>No data</h2>
        <p>No diff data available</p>
      </div>
    );
  }

  return (
    <CommentProvider
      comments={comments}
      onAddComment={addComment}
      onGeneratePrompt={generatePrompt}
    >
      <div className={styles.app}>
        <header className={styles.header}>
          <h1>📋 ReviewIt</h1>
          <div className={styles.commitInfo}>
            <span>
              Reviewing: <code>{diffData.commit}</code>
            </span>
            <span>
              {diffData.files.length} file{diffData.files.length !== 1 ? 's' : ''} changed
            </span>
          </div>
        </header>

        <div className={styles.content}>
          <aside className={styles.sidebar}>
            <FileList
              files={diffData.files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              comments={comments}
            />
          </aside>

          <main className={styles.main}>
            {selectedFile && (
              <DiffViewer
                file={diffData.files.find((f) => f.path === selectedFile)!}
                comments={comments.filter((c) => c.file === selectedFile)}
              />
            )}
          </main>
        </div>
      </div>
    </CommentProvider>
  );
}

export default App;
