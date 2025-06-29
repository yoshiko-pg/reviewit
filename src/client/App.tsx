import { useState, useEffect } from 'react';
import { DiffResponse, Comment } from '../types/diff';
import { FileList } from './components/FileList';
import { DiffViewer } from './components/DiffViewer';
import { CommentProvider } from './components/CommentContext';
import { ClipboardList, Columns, AlignLeft } from 'lucide-react';

function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState<'side-by-side' | 'inline'>('side-by-side');
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

  const toggleFileReviewed = (filePath: string) => {
    setReviewedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-github-bg-primary">
        <div className="text-github-text-secondary text-base">Loading diff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-github-bg-primary text-center gap-2">
        <h2 className="text-github-danger text-2xl mb-2">Error</h2>
        <p className="text-github-text-secondary text-base">{error}</p>
      </div>
    );
  }

  if (!diffData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-github-bg-primary text-center gap-2">
        <h2 className="text-github-danger text-2xl mb-2">No data</h2>
        <p className="text-github-text-secondary text-base">No diff data available</p>
      </div>
    );
  }

  return (
    <CommentProvider
      comments={comments}
      onAddComment={addComment}
      onGeneratePrompt={generatePrompt}
    >
      <div className="h-screen flex flex-col">
        <header className="bg-github-bg-secondary border-b border-github-border flex items-center">
          <div className="w-80 min-w-80 px-4 py-3 border-r border-github-border">
            <h1 className="text-lg font-semibold text-github-text-primary m-0 flex items-center gap-2">
              <ClipboardList size={20} />
              ReviewIt
            </h1>
          </div>
          <div className="flex-1 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex bg-github-bg-tertiary border border-github-border rounded-md p-1">
              <button
                onClick={() => setDiffMode('side-by-side')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  diffMode === 'side-by-side'
                    ? 'bg-github-bg-primary text-github-text-primary shadow-sm'
                    : 'text-github-text-secondary hover:text-github-text-primary'
                }`}
              >
                <Columns size={14} />
                Side by Side
              </button>
              <button
                onClick={() => setDiffMode('inline')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  diffMode === 'inline'
                    ? 'bg-github-bg-primary text-github-text-primary shadow-sm'
                    : 'text-github-text-secondary hover:text-github-text-primary'
                }`}
              >
                <AlignLeft size={14} />
                Inline
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm text-github-text-secondary">
              <span>
                Reviewing:{' '}
                <code className="bg-github-bg-tertiary px-1.5 py-0.5 rounded text-xs text-github-text-primary">
                  {diffData.commit}
                </code>
              </span>
              <span>
                {diffData.files.length} file{diffData.files.length !== 1 ? 's' : ''} changed
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-80 min-w-80 bg-github-bg-secondary border-r border-github-border overflow-y-auto">
            <FileList
              files={diffData.files}
              onScrollToFile={(filePath) => {
                const element = document.getElementById(
                  `file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`
                );
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              comments={comments}
              reviewedFiles={reviewedFiles}
              onToggleReviewed={toggleFileReviewed}
            />
          </aside>

          <main className="flex-1 overflow-y-auto">
            {diffData.files.map((file) => (
              <div
                key={file.path}
                id={`file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className="mb-6"
              >
                <DiffViewer
                  file={file}
                  comments={comments.filter((c) => c.file === file.path)}
                  diffMode={diffMode}
                  reviewedFiles={reviewedFiles}
                  onToggleReviewed={toggleFileReviewed}
                />
              </div>
            ))}
          </main>
        </div>
      </div>
    </CommentProvider>
  );
}

export default App;
