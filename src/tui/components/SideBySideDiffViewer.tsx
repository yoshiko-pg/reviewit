import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { FileDiff } from '../../types/diff.js';
import { parseDiff } from '../utils/parseDiff.js';

interface SideBySideDiffViewerProps {
  files: FileDiff[];
  initialFileIndex: number;
  onBack: () => void;
}

const SideBySideDiffViewer: React.FC<SideBySideDiffViewerProps> = ({
  files,
  initialFileIndex,
  onBack,
}) => {
  const [currentFileIndex, setCurrentFileIndex] = useState(initialFileIndex);
  const [scrollOffset, setScrollOffset] = useState(0);

  const currentFile = files[currentFileIndex];

  if (!currentFile || files.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text color="yellow">No files to display</Text>
        <Box marginTop={1}>
          <Text dimColor>Press ESC or 'b' to go back</Text>
        </Box>
      </Box>
    );
  }

  const parsedDiff = parseDiff(currentFile.diff);

  // Calculate total lines for current file
  const allLines: Array<{
    old?: string;
    new?: string;
    oldNum?: number;
    newNum?: number;
    type: string;
  }> = [];

  parsedDiff.chunks.forEach((chunk) => {
    // Add chunk header
    allLines.push({
      old: chunk.header,
      new: chunk.header,
      type: 'header',
    });

    let oldIdx = 0;
    let newIdx = 0;

    while (oldIdx < chunk.lines.length || newIdx < chunk.lines.length) {
      const oldLine = chunk.lines[oldIdx];
      const newLine = chunk.lines[newIdx];

      if (oldLine?.type === 'remove' && newLine?.type === 'add') {
        // Same line modified - show side by side
        allLines.push({
          old: oldLine.content,
          new: newLine.content,
          oldNum: oldLine.oldLineNumber,
          newNum: newLine.newLineNumber,
          type: 'modified',
        });
        oldIdx++;
        newIdx++;
      } else if (oldLine?.type === 'remove') {
        // Line removed
        allLines.push({
          old: oldLine.content,
          oldNum: oldLine.oldLineNumber,
          type: 'remove',
        });
        oldIdx++;
      } else if (newLine?.type === 'add') {
        // Line added
        allLines.push({
          new: newLine.content,
          newNum: newLine.newLineNumber,
          type: 'add',
        });
        newIdx++;
      } else if (oldLine?.type === 'context') {
        // Unchanged line
        allLines.push({
          old: oldLine.content,
          new: oldLine.content,
          oldNum: oldLine.oldLineNumber,
          newNum: oldLine.newLineNumber,
          type: 'context',
        });
        oldIdx++;
        newIdx++;
      } else {
        oldIdx++;
        newIdx++;
      }
    }
  });

  const viewportHeight = Math.max(10, (process.stdout.rows || 24) - 7); // StatusBar(3) + footer(3) + margin(1)
  const maxScroll = Math.max(0, allLines.length - viewportHeight);

  const { exit } = useApp();

  useInput(
    (input, key) => {
      if (input === 'q' || (key.ctrl && input === 'c')) {
        exit();
        return;
      }

      if (key.escape || input === 'b') {
        onBack();
        return;
      }

      // Scroll within file
      if (key.upArrow || input === 'k') {
        setScrollOffset((prev) => Math.max(0, prev - 1));
      }
      if (key.downArrow || input === 'j') {
        setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
      }
      if (key.pageUp) {
        setScrollOffset((prev) => Math.max(0, prev - viewportHeight));
      }
      if (key.pageDown) {
        setScrollOffset((prev) => Math.min(maxScroll, prev + viewportHeight));
      }

      // Navigate between files
      if (key.tab && !key.shift) {
        // Next file (loop to first when at end)
        setCurrentFileIndex((currentFileIndex + 1) % files.length);
        setScrollOffset(0);
      }
      if (key.tab && key.shift) {
        // Previous file (loop to last when at start)
        setCurrentFileIndex((currentFileIndex - 1 + files.length) % files.length);
        setScrollOffset(0);
      }
    },
    { isActive: true }
  );

  const visibleLines = allLines.slice(scrollOffset, scrollOffset + viewportHeight);
  const terminalWidth = process.stdout.columns || 80;
  const columnWidth = Math.floor((terminalWidth - 6) / 2); // 6 for borders and separators

  const getLineColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'green';
      case 'remove':
        return 'red';
      case 'modified':
        return undefined; // Will be handled separately for each side
      case 'header':
        return 'cyan';
      default:
        return undefined;
    }
  };

  const truncateLine = (line: string, width: number) => {
    if (line.length <= width) return line.padEnd(width);
    return line.substring(0, width - 1) + '…';
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text bold>
            {currentFile.path} ({currentFileIndex + 1}/{files.length})
          </Text>
          <Text dimColor>
            {' '}
            - {currentFile.additions} additions, {currentFile.deletions} deletions
          </Text>
        </Box>
        <Box>
          <Text dimColor>
            {currentFileIndex > 0 && `← ${files[currentFileIndex - 1].path}`}
            {currentFileIndex > 0 && currentFileIndex < files.length - 1 && ' | '}
            {currentFileIndex < files.length - 1 && `${files[currentFileIndex + 1].path} →`}
          </Text>
        </Box>
      </Box>

      <Box borderStyle="single" flexDirection="column" flexGrow={1}>
        {/* Header */}
        <Box borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
          <Box width={columnWidth}>
            <Text dimColor> │ </Text>
            <Text bold>Old</Text>
          </Box>
          <Text dimColor> ┃ </Text>
          <Box width={columnWidth}>
            <Text dimColor> │ </Text>
            <Text bold>New</Text>
          </Box>
        </Box>

        {/* Content */}
        <Box flexDirection="column" flexGrow={1}>
          {visibleLines.map((line, index) => (
            <Box key={`line-${scrollOffset + index}`}>
              <Box width={columnWidth}>
                <Text dimColor>{line.oldNum ? String(line.oldNum).padStart(4) : '    '}</Text>
                <Text dimColor> │ </Text>
                <Text
                  color={line.type === 'remove' || line.type === 'modified' ? 'red' : undefined}
                  dimColor={line.type === 'header'}
                >
                  {line.type === 'remove' || line.type === 'modified' ? '- ' : '  '}
                </Text>
                <Text
                  color={
                    line.type === 'remove' || line.type === 'modified'
                      ? 'red'
                      : getLineColor(line.type)
                  }
                >
                  {line.old
                    ? truncateLine(line.old, columnWidth - 10)
                    : ' '.repeat(columnWidth - 10)}
                </Text>
              </Box>
              <Text dimColor> ┃ </Text>
              <Box width={columnWidth}>
                <Text dimColor>{line.newNum ? String(line.newNum).padStart(4) : '    '}</Text>
                <Text dimColor> │ </Text>
                <Text
                  color={line.type === 'add' || line.type === 'modified' ? 'green' : undefined}
                  dimColor={line.type === 'header'}
                >
                  {line.type === 'add' || line.type === 'modified' ? '+ ' : '  '}
                </Text>
                <Text
                  color={
                    line.type === 'add' || line.type === 'modified'
                      ? 'green'
                      : getLineColor(line.type)
                  }
                >
                  {line.new
                    ? truncateLine(line.new, columnWidth - 10)
                    : ' '.repeat(columnWidth - 10)}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>
          Lines {scrollOffset + 1}-{Math.min(scrollOffset + viewportHeight, allLines.length)} of{' '}
          {allLines.length}
          {scrollOffset + viewportHeight < allLines.length &&
            ` (${allLines.length - scrollOffset - viewportHeight} more)`}
        </Text>
        <Text dimColor>Tab: next file | Shift+Tab: prev file | ↑↓/jk: scroll | ESC/b: back</Text>
      </Box>
    </Box>
  );
};

export default SideBySideDiffViewer;
