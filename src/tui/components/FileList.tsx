import React from 'react';
import { Box, Text } from 'ink';
import { FileDiff } from '../../types/diff.js';

interface FileListProps {
  files: FileDiff[];
  selectedIndex: number;
}

const FileList: React.FC<FileListProps> = ({ files, selectedIndex }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A':
        return 'green';
      case 'M':
        return 'yellow';
      case 'D':
        return 'red';
      default:
        return 'white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'A':
        return '[+]';
      case 'M':
        return '[M]';
      case 'D':
        return '[-]';
      default:
        return '[?]';
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Changed Files ({files.length})</Text>
      </Box>
      {files.map((file, index) => (
        <Box key={`${file.path}-${index}`}>
          <Text
            color={index === selectedIndex ? 'cyan' : undefined}
            backgroundColor={index === selectedIndex ? 'gray' : undefined}
          >
            {index === selectedIndex ? '▶ ' : '  '}
            <Text color={getStatusColor(file.status)}>{getStatusLabel(file.status)}</Text>{' '}
            {file.path}{' '}
            <Text dimColor>
              (+{file.additions} -{file.deletions})
            </Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export default FileList;
