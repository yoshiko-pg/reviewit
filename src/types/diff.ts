export interface GeneralDiffFile {
  path: string;
  oldPath?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}

export interface FileDiff {
  path: string;
  status: 'A' | 'M' | 'D';
  diff: string;
  additions: number;
  deletions: number;
}

export interface DiffChunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'delete' | 'normal' | 'hunk' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ParsedDiff {
  chunks: DiffChunk[];
}

export interface DiffResponse {
  commit: string;
  files: DiffFile[];
  ignoreWhitespace?: boolean;
  isEmpty?: boolean;
  mode?: string;
  baseCommitish?: string;
  targetCommitish?: string;
}

export type LineNumber = number | [number, number];

export interface Comment {
  id: string;
  file: string;
  line: LineNumber;
  body: string;
  timestamp: string;
  codeContent?: string; // The actual code content for this line
}

// Import notebook types from separate file
export type { NotebookDiffFile, NotebookDiff } from './notebook';
import type { NotebookDiffFile } from './notebook';

export interface LineSelection {
  side: 'old' | 'new';
  lineNumber: number;
}

// Union type for all diff file types
export type DiffFile = GeneralDiffFile | NotebookDiffFile;

// Type guard to check if file is a NotebookDiffFile
export function isNotebookDiffFile(file: DiffFile): file is NotebookDiffFile {
  return 'cellDiffs' in file;
}
