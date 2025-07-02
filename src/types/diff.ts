export interface DiffFile {
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
  files: (DiffFile | NotebookDiffFile)[];
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

// Jupyter Notebook specific types
export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[] | string;
  metadata?: Record<string, any>;
  execution_count?: number | null;
  outputs?: NotebookOutput[];
}

export interface NotebookOutput {
  output_type: 'stream' | 'display_data' | 'execute_result' | 'error';
  data?: Record<string, any>;
  text?: string[];
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface CellDiff {
  cellIndex: number;
  oldCellIndex?: number;
  status: 'added' | 'deleted' | 'modified' | 'moved' | 'unchanged';
  oldCell?: NotebookCell;
  newCell?: NotebookCell;
  sourceChanges?: DiffChunk[];
  outputChanges?: {
    added: NotebookOutput[];
    deleted: NotebookOutput[];
    modified: Array<{
      old: NotebookOutput;
      new: NotebookOutput;
    }>;
  };
  outputDiffChunks?: DiffChunk[];
  metadataChanged?: boolean;
  executionCountChanged?: boolean;
}

export interface NotebookDiffFile {
  path: string;
  oldPath?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  cellDiffs: CellDiff[];
  metadataChanged?: boolean;
  totalCellsAdded: number;
  totalCellsDeleted: number;
  totalCellsModified: number;
}

export interface NotebookDiff {
  files: NotebookDiffFile[];
}
