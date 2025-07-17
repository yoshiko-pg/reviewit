import { type DiffChunk, type ParsedDiff } from '../../types/diff.js';

export function parseDiff(diffText: string): ParsedDiff {
  const lines = diffText.split('\n');
  const chunks: DiffChunk[] = [];
  let currentChunk: DiffChunk | null = null;
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of lines) {
    // Skip file headers
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      continue;
    }

    // Chunk header
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match) {
        const [, oldStart, oldLinesStr, newStart, newLinesStr] = match;
        currentChunk = {
          header: line,
          oldStart: parseInt(oldStart),
          oldLines: parseInt(oldLinesStr || '1'),
          newStart: parseInt(newStart),
          newLines: parseInt(newLinesStr || '1'),
          lines: [],
        };
        chunks.push(currentChunk);
        oldLineNumber = currentChunk.oldStart - 1;
        newLineNumber = currentChunk.newStart - 1;
      }
      continue;
    }

    // Skip if no current chunk
    if (!currentChunk) continue;

    // Parse diff lines
    if (line.startsWith('+')) {
      newLineNumber++;
      currentChunk.lines.push({
        type: 'add',
        content: line.substring(1),
        newLineNumber: newLineNumber,
      });
    } else if (line.startsWith('-')) {
      oldLineNumber++;
      currentChunk.lines.push({
        type: 'remove',
        content: line.substring(1),
        oldLineNumber: oldLineNumber,
      });
    } else {
      // Context line
      oldLineNumber++;
      newLineNumber++;
      currentChunk.lines.push({
        type: 'context',
        content: line.substring(1),
        oldLineNumber: oldLineNumber,
        newLineNumber: newLineNumber,
      });
    }
  }

  return { chunks };
}
