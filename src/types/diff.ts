export interface DiffFile {
  path: string;
  oldPath?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
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
  type: 'add' | 'delete' | 'normal' | 'hunk';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResponse {
  commit: string;
  files: DiffFile[];
  ignoreWhitespace?: boolean;
}

export interface Comment {
  id: string;
  file: string;
  line: number;
  body: string;
  timestamp: string;
  codeContent?: string; // The actual code content for this line
}
