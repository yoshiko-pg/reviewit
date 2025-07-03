import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  commitish: string;
  totalFiles: number;
  currentMode: 'list' | 'inline' | 'side-by-side';
}

const StatusBar: React.FC<StatusBarProps> = ({ commitish, totalFiles, currentMode }) => {
  return (
    <Box borderStyle="round" paddingX={1} marginBottom={1}>
      <Box flexGrow={1}>
        <Text bold color="cyan">
          📋 ReviewIt TUI
        </Text>
        <Text> | </Text>
        <Text color="yellow">{commitish}</Text>
        <Text> | </Text>
        <Text>{totalFiles} files changed</Text>
      </Box>
      <Box>
        <Text dimColor>
          [
          {currentMode === 'list'
            ? 'File List'
            : currentMode === 'side-by-side'
              ? 'Side-by-Side'
              : 'Inline Diff'}
          ]
        </Text>
      </Box>
    </Box>
  );
};

export default StatusBar;
