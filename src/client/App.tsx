import {
  Columns,
  AlignLeft,
  Copy,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { type DiffResponse, type LineNumber } from '../types/diff';

import { Checkbox } from './components/Checkbox';
import { DiffViewer } from './components/DiffViewer';
import { FileList } from './components/FileList';
import { GitHubIcon } from './components/GitHubIcon';
import { Logo } from './components/Logo';
import { SettingsModal } from './components/SettingsModal';
import { useAppearanceSettings } from './hooks/useAppearanceSettings';
import { useLocalComments } from './hooks/useLocalComments';

function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState<'side-by-side' | 'inline'>('side-by-side');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); // 320px default width
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const { settings, updateSettings } = useAppearanceSettings();

  const {
    comments,
    addComment,
    removeComment,
    updateComment,
    clearAllComments,
    generatePrompt,
    generateAllCommentsPrompt,
  } = useLocalComments(diffData?.commit);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(600, startWidth + (e.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Check if file is a lock file that should be collapsed by default
  const isLockFile = (filePath: string): boolean => {
    const lockFiles = [
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'Cargo.lock',
      'Gemfile.lock',
      'composer.lock',
      'Pipfile.lock',
      'poetry.lock',
      'go.sum',
      'mix.lock',
    ];
    const fileName = filePath.split('/').pop() || '';
    return lockFiles.includes(fileName);
  };

  const fetchDiffData = useCallback(async () => {
    try {
      const response = await fetch(`/api/diff?ignoreWhitespace=${ignoreWhitespace}`);
      if (!response.ok) throw new Error('Failed to fetch diff data');
      const data = (await response.json()) as DiffResponse;
      setDiffData(data);

      // Set diff mode from server response if provided
      if (data.mode) {
        setDiffMode(data.mode as 'side-by-side' | 'inline');
      }

      // Auto-collapse lock files
      const lockFilesToCollapse = data.files
        .filter((file) => isLockFile(file.path))
        .map((file) => file.path);

      if (lockFilesToCollapse.length > 0) {
        setReviewedFiles((prev) => new Set([...prev, ...lockFilesToCollapse]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [ignoreWhitespace]);

  useEffect(() => {
    void fetchDiffData();
  }, [fetchDiffData]);

  // Clear comments on initial load if requested via CLI flag
  const hasCleanedRef = useRef(false);
  useEffect(() => {
    if (diffData?.clearComments && !hasCleanedRef.current) {
      hasCleanedRef.current = true;
      clearAllComments();
      console.log('✅ All existing comments cleared as requested via --clean flag');
    }
  }, [diffData?.clearComments, clearAllComments]);

  // Send comments to server before page unload
  useEffect(() => {
    const sendCommentsBeforeUnload = () => {
      if (comments.length > 0) {
        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({ comments });
        navigator.sendBeacon('/api/comments', data);
      }
    };

    window.addEventListener('beforeunload', sendCommentsBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', sendCommentsBeforeUnload);
      // Also send comments when component unmounts
      sendCommentsBeforeUnload();
    };
  }, [comments]);

  // Establish SSE connection for tab close detection
  useEffect(() => {
    const eventSource = new EventSource('/api/heartbeat');

    eventSource.onopen = () => {
      console.log('Connected to server heartbeat');
    };

    eventSource.onerror = () => {
      console.log('Server connection lost');
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  const handleAddComment = (
    file: string,
    line: LineNumber,
    body: string,
    codeContent?: string
  ): Promise<void> => {
    addComment(file, line, body, codeContent);
    return Promise.resolve();
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
            element.scrollIntoView({ behavior: 'instant', block: 'start' });
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
        <div
          className={`px-4 py-3 flex items-center justify-between gap-4 ${!isDragging ? '!transition-all !duration-300 !ease-in-out' : ''}`}
          style={{
            width: isFileTreeOpen ? `${sidebarWidth}px` : 'auto',
            minWidth: isFileTreeOpen ? '200px' : 'auto',
            maxWidth: isFileTreeOpen ? '600px' : 'auto',
          }}
        >
          <h1>
            <Logo style={{ height: '18px', color: 'var(--color-github-text-secondary)' }} />
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFileTreeOpen(!isFileTreeOpen)}
              className="p-2 text-github-text-secondary hover:text-github-text-primary hover:bg-github-bg-tertiary rounded transition-colors"
              title={isFileTreeOpen ? 'Collapse file tree' : 'Expand file tree'}
              aria-expanded={isFileTreeOpen}
              aria-controls="file-tree-panel"
              aria-label="Toggle file tree panel"
            >
              {isFileTreeOpen ?
                <PanelLeftClose size={18} />
              : <PanelLeft size={18} />}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-github-text-secondary hover:text-github-text-primary hover:bg-github-bg-tertiary rounded transition-colors"
              title="Appearance Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
        <div
          className={`border-r border-github-border ${!isDragging ? '!transition-all !duration-300 !ease-in-out' : ''}`}
          style={{
            width: isFileTreeOpen ? '4px' : '0px',
            height: 'calc(100% - 16px)',
            margin: '8px 0',
            transform: 'translateX(-2px)',
          }}
        />
        <div className="flex-1 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex bg-github-bg-tertiary border border-github-border rounded-md p-1">
              <button
                onClick={() => setDiffMode('side-by-side')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  diffMode === 'side-by-side' ?
                    'bg-github-bg-primary text-github-text-primary shadow-sm'
                  : 'text-github-text-secondary hover:text-github-text-primary'
                }`}
              >
                <Columns size={14} />
                Side by Side
              </button>
              <button
                onClick={() => setDiffMode('inline')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  diffMode === 'inline' ?
                    'bg-github-bg-primary text-github-text-primary shadow-sm'
                  : 'text-github-text-secondary hover:text-github-text-primary'
                }`}
              >
                <AlignLeft size={14} />
                Inline
              </button>
            </div>
            <Checkbox
              checked={ignoreWhitespace}
              onChange={setIgnoreWhitespace}
              label="Ignore Whitespace"
              title={ignoreWhitespace ? 'Show whitespace changes' : 'Ignore whitespace changes'}
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-github-text-secondary">
            {comments.length > 0 && (
              <>
                <button
                  onClick={handleCopyAllComments}
                  className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--color-yellow-btn-bg)',
                    color: 'var(--color-yellow-btn-text)',
                    border: '1px solid var(--color-yellow-btn-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-hover-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-yellow-btn-hover-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-yellow-btn-border)';
                  }}
                  title={`Copy all ${comments.length} comments to AI coding agent`}
                >
                  <Copy size={12} />
                  {isCopiedAll ? 'Copied All!' : `Copy All Prompt (${comments.length})`}
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete all ${comments.length} comments?`
                      )
                    ) {
                      clearAllComments();
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap flex items-center gap-1.5 text-github-danger hover:text-github-danger-hover bg-github-bg-tertiary hover:bg-github-danger-subtle border border-github-border hover:border-github-danger"
                  title={`Delete all ${comments.length} comments`}
                >
                  <Trash2 size={12} />
                  Delete All Comments
                </button>
              </>
            )}
            <div className="flex flex-col gap-1 items-center">
              <div className="text-xs">
                {reviewedFiles.size === diffData.files.length ?
                  'All diffs difit-ed!'
                : `${reviewedFiles.size} / ${diffData.files.length} files viewed`}
              </div>
              <div
                className="relative h-2 bg-github-bg-tertiary rounded-full overflow-hidden"
                style={{
                  width: '90px',
                  border: '1px solid var(--color-github-border)',
                }}
              >
                <div
                  className="absolute top-0 right-0 h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${((diffData.files.length - reviewedFiles.size) / diffData.files.length) * 100}%`,
                    backgroundColor: (() => {
                      const remainingPercent =
                        ((diffData.files.length - reviewedFiles.size) / diffData.files.length) *
                        100;
                      if (remainingPercent > 50) return 'var(--color-github-accent)'; // green
                      if (remainingPercent > 20) return 'var(--color-github-warning)'; // yellow
                      return 'var(--color-github-danger)'; // red
                    })(),
                  }}
                />
              </div>
            </div>
            <span>
              Reviewing:{' '}
              <code className="bg-github-bg-tertiary px-1.5 py-0.5 rounded text-xs text-github-text-primary">
                {diffData.commit.includes('...') ?
                  <>
                    <span className="text-github-text-secondary font-medium">
                      {diffData.commit.split('...')[0]}...
                    </span>
                    <span className="font-medium">{diffData.commit.split('...')[1]}</span>
                  </>
                : diffData.commit}
              </code>
            </span>
            <span>
              {diffData.files.length} file
              {diffData.files.length !== 1 ? 's' : ''} changed
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`relative overflow-hidden ${!isDragging ? '!transition-all !duration-300 !ease-in-out' : ''}`}
          style={{
            width: isFileTreeOpen ? `${sidebarWidth}px` : '0px',
          }}
        >
          <aside
            id="file-tree-panel"
            className="bg-github-bg-secondary border-r border-github-border overflow-y-auto flex flex-col"
            style={{
              width: `${sidebarWidth}px`,
              minWidth: '200px',
              maxWidth: '600px',
              height: '100%',
            }}
          >
            <div className="flex-1 overflow-y-auto">
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
            </div>
            <div className="p-4 border-t border-github-border flex justify-end">
              <a
                href="https://github.com/yoshiko-pg/difit"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-github-text-secondary hover:text-github-text-primary transition-colors"
                title="View on GitHub"
              >
                <span className="text-sm">Star on GitHub</span>
                <GitHubIcon style={{ height: '18px', width: '18px' }} />
              </a>
            </div>
          </aside>
        </div>

        <div
          className={`bg-github-border hover:bg-github-text-muted cursor-col-resize ${!isDragging ? '!transition-all !duration-300 !ease-in-out' : ''}`}
          style={{
            width: isFileTreeOpen ? '4px' : '0px',
          }}
          onMouseDown={handleMouseDown}
          title="Drag to resize file list"
        />

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
                onUpdateComment={updateComment}
                syntaxTheme={settings.syntaxTheme}
                baseCommitish={diffData.baseCommitish}
                targetCommitish={diffData.targetCommitish}
              />
            </div>
          ))}
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  );
}

export default App;
