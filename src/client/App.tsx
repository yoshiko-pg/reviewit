import { useState, useEffect } from 'react';
import { DiffResponse } from '../types/diff';
import { FileList } from './components/FileList';
import { DiffViewer } from './components/DiffViewer';
import { useLocalComments } from './hooks/useLocalComments';
import { ClipboardList, Columns, AlignLeft, Copy } from 'lucide-react';

function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState<'side-by-side' | 'inline'>('side-by-side');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  const { comments, addComment, removeComment, generatePrompt, generateAllCommentsPrompt } =
    useLocalComments(diffData?.commit);

  useEffect(() => {
    fetchDiffData();
  }, [ignoreWhitespace]);

  const fetchDiffData = async () => {
    try {
      const response = await fetch(`/api/diff?ignoreWhitespace=${ignoreWhitespace}`);
      if (!response.ok) throw new Error('Failed to fetch diff data');
      const data = await response.json();
      setDiffData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (
    file: string,
    line: number,
    body: string,
    codeContent?: string
  ) => {
    addComment(file, line, body, codeContent);
  };

  const handleCopyAllComments = async () => {
    try {
      const prompt = generateAllCommentsPrompt();
      await navigator.clipboard.writeText(prompt);
      setIsCopiedAll(true);
      setTimeout(() => setIsCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy all comments prompt:', error);
    }
  };

  const toggleFileReviewed = (filePath: string) => {
    setReviewedFiles((prev) => {
      const newSet = new Set(prev);
      const wasReviewed = newSet.has(filePath);

      if (wasReviewed) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
        // When marking as reviewed (closing file), scroll to the file header
        setTimeout(() => {
          const element = document.getElementById(`file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
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
    <div className="h-screen flex flex-col">
      <header className="bg-github-bg-secondary border-b border-github-border flex items-center">
        <div className="w-80 min-w-80 px-4 py-3 border-r border-github-border">
          <h1 className="text-lg font-semibold text-github-text-primary m-0 flex items-center gap-2">
            <ClipboardList size={20} />
            ReviewIt
          </h1>
        </div>
        <div className="flex-1 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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
            <label className="flex items-center gap-2 text-xs text-github-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(e) => setIgnoreWhitespace(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-github-accent bg-github-bg-tertiary border border-github-border rounded"
                title={ignoreWhitespace ? 'Show whitespace changes' : 'Ignore whitespace changes'}
              />
              Ignore Whitespace
            </label>
            {comments.length > 0 && (
              <button
                onClick={handleCopyAllComments}
                className="text-xs px-3 py-1.5 bg-yellow-900/20 text-yellow-200 border border-yellow-600/50 rounded hover:bg-yellow-800/30 hover:border-yellow-500 transition-all whitespace-nowrap flex items-center gap-1.5"
                title={`Copy all ${comments.length} comments to Claude Code`}
              >
                <Copy size={12} />
                {isCopiedAll ? 'Copied All!' : `Copy All (${comments.length})`}
              </button>
            )}
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
                onAddComment={handleAddComment}
                onGeneratePrompt={generatePrompt}
                onRemoveComment={removeComment}
              />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

export default App;
