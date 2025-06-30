import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { loadGitDiff } from '../server/git-diff-simple.js';
import FileList from './components/FileList.js';
import DiffViewer from './components/DiffViewer.js';
import SideBySideDiffViewer from './components/SideBySideDiffViewer.js';
import StatusBar from './components/StatusBar.js';
import { FileDiff } from '../types/diff.js';

interface AppProps {
  commitish: string;
}

const App: React.FC<AppProps> = ({ commitish }) => {
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'diff' | 'side-by-side'>('side-by-side');
  const { exit } = useApp();

  useEffect(() => {
    const loadDiff = async () => {
      try {
        const fileDiffs = await loadGitDiff(commitish);
        setFiles(fileDiffs);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadDiff();
  }, [commitish]);

  useInput(
    (input, key) => {
      if (input === 'q' || (key.ctrl && input === 'c')) {
        exit();
      }

      if (viewMode === 'list') {
        if (key.upArrow || input === 'k') {
          setSelectedFileIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.downArrow || input === 'j') {
          setSelectedFileIndex((prev) => Math.min(files.length - 1, prev + 1));
        }
        if (key.return || input === ' ') {
          setViewMode('side-by-side');
        }
        if (input === 'd') {
          setViewMode('diff');
        }
      } else {
        if (key.escape || input === 'b') {
          setViewMode('list');
        }
      }
    },
    { isActive: true }
  );

  if (loading) {
    return <Text>Loading diff for {commitish}...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (files.length === 0) {
    return (
      <Box flexDirection="column">
        <StatusBar commitish={commitish} totalFiles={0} currentMode="list" />
        <Box marginTop={1}>
          <Text color="yellow">No changes found for {commitish}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      <StatusBar commitish={commitish} totalFiles={files.length} currentMode={viewMode} />
      <Box flexGrow={1} flexDirection="column">
        {viewMode === 'list' ? (
          <FileList files={files} selectedIndex={selectedFileIndex} />
        ) : viewMode === 'side-by-side' ? (
          <SideBySideDiffViewer
            files={files}
            initialFileIndex={selectedFileIndex}
            onBack={() => setViewMode('list')}
          />
        ) : (
          <DiffViewer
            files={files}
            initialFileIndex={selectedFileIndex}
            onBack={() => setViewMode('list')}
          />
        )}
      </Box>
      <Box borderStyle="single" paddingX={1}>
        <Text dimColor>
          {viewMode === 'list'
            ? '↑/↓ or j/k: navigate | Enter/Space: side-by-side | d: unified diff | q: quit'
            : viewMode === 'side-by-side'
              ? 'Tab: next file | Shift+Tab: prev | ↑/↓ or j/k: scroll | ESC/b: list | q: quit'
              : 'Tab: next | Shift+Tab: prev | ↑/↓ or j/k: scroll | ESC/b: list | q: quit'}
        </Text>
      </Box>
    </Box>
  );
};

export default App;
