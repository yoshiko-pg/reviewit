import { simpleGit, type SimpleGit } from 'simple-git';

import { validateDiffArguments } from '../cli/utils.js';
import {
  type NotebookCell,
  type CellDiff,
  type NotebookDiffFile,
  type DiffChunk,
  type DiffLine,
  type NotebookOutput,
} from '../types/diff.js';

// Constants for better maintainability
const NOTEBOOK_FORMATS = {
  CURRENT: 4,
  MIN_SUPPORTED: 3,
} as const;

const DIFF_CHUNK_HEADERS = {
  SOURCE: '@@ Cell Source Changes @@',
  OUTPUT: '@@ Output Changes @@',
} as const;

interface NotebookData {
  cells: NotebookCell[];
  metadata?: Record<string, any>;
  nbformat?: number;
  nbformat_minor?: number;
}

export class NotebookDiffParser {
  private git: SimpleGit;

  constructor(repoPath = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  async parseNotebookDiff(
    targetCommitish: string,
    baseCommitish: string,
    filePath: string
  ): Promise<NotebookDiffFile> {
    try {
      // Validate input arguments
      const validation = validateDiffArguments(targetCommitish, baseCommitish);
      if (!validation.valid) {
        throw new Error(`Invalid diff arguments: ${validation.error}`);
      }

      // Validate file path
      if (!filePath || !filePath.endsWith('.ipynb')) {
        throw new Error(`Invalid notebook file path: ${filePath}`);
      }

      const [oldNotebook, newNotebook] = await this.getNotebookContents(
        targetCommitish,
        baseCommitish,
        filePath
      );

      // Handle case where both versions are null (shouldn't happen but be defensive)
      if (!oldNotebook && !newNotebook) {
        throw new Error(`Could not retrieve any version of notebook: ${filePath}`);
      }

      const cellDiffs = this.calculateCellDiffs(oldNotebook?.cells || [], newNotebook?.cells || []);
      const metadataChanged = this.hasMetadataChanged(oldNotebook?.metadata, newNotebook?.metadata);
      const stats = this.calculateStats(cellDiffs);
      const status = this.determineFileStatus(oldNotebook, newNotebook);

      return {
        path: filePath,
        status,
        cellDiffs,
        metadataChanged,
        ...stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Notebook diff parsing failed for ${filePath}:`, errorMessage);
      throw new Error(`Failed to parse notebook diff for ${filePath}: ${errorMessage}`);
    }
  }

  private determineFileStatus(
    oldNotebook: NotebookData | null,
    newNotebook: NotebookData | null
  ): NotebookDiffFile['status'] {
    if (!oldNotebook && newNotebook) return 'added';
    if (oldNotebook && !newNotebook) return 'deleted';
    return 'modified';
  }

  private async getNotebookContents(
    targetCommitish: string,
    baseCommitish: string,
    filePath: string
  ): Promise<[NotebookData | null, NotebookData | null]> {
    const [oldContent, newContent] = await this.getFileContents(
      targetCommitish,
      baseCommitish,
      filePath
    );

    return [
      oldContent ? this.parseNotebookJson(oldContent) : null,
      newContent ? this.parseNotebookJson(newContent) : null,
    ];
  }

  private async getFileContents(
    targetCommitish: string,
    baseCommitish: string,
    filePath: string
  ): Promise<[string | null, string | null]> {
    const contentRetrievers = {
      working: () => this.getWorkingContents(filePath),
      staged: () => this.getStagedContents(baseCommitish, filePath),
      '.': () => this.getCurrentContents(baseCommitish, filePath),
      default: () => this.getCommitContents(targetCommitish, baseCommitish, filePath),
    };

    const retriever =
      contentRetrievers[targetCommitish as keyof typeof contentRetrievers] ||
      contentRetrievers.default;
    return retriever();
  }

  private async getWorkingContents(filePath: string): Promise<[string | null, string | null]> {
    const newContent = await this.safeGitShow(`HEAD:${filePath}`);
    const oldContent = await this.safeFileRead(filePath);
    return [oldContent, newContent];
  }

  private async getStagedContents(
    baseCommitish: string,
    filePath: string
  ): Promise<[string | null, string | null]> {
    const oldContent = await this.safeGitShow(`${baseCommitish}:${filePath}`);
    const newContent = await this.safeGitShow(`:${filePath}`);
    return [oldContent, newContent];
  }

  private async getCurrentContents(
    baseCommitish: string,
    filePath: string
  ): Promise<[string | null, string | null]> {
    const oldContent = await this.safeGitShow(`${baseCommitish}:${filePath}`);
    const newContent = await this.safeFileRead(filePath);
    return [oldContent, newContent];
  }

  private async getCommitContents(
    targetCommitish: string,
    baseCommitish: string,
    filePath: string
  ): Promise<[string | null, string | null]> {
    const oldContent = await this.safeGitShow(`${baseCommitish}:${filePath}`);
    const newContent = await this.safeGitShow(`${targetCommitish}:${filePath}`);
    return [oldContent, newContent];
  }

  private async safeGitShow(ref: string): Promise<string | null> {
    try {
      return await this.git.show([ref]);
    } catch {
      return null;
    }
  }

  private async safeFileRead(filePath: string): Promise<string | null> {
    try {
      const fs = await import('fs/promises');
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private parseNotebookJson(content: string): NotebookData | null {
    try {
      const parsed = JSON.parse(content) as NotebookData;

      // Basic validation
      if (!parsed.cells || !Array.isArray(parsed.cells)) {
        console.warn('Invalid notebook format: missing or invalid cells array');
        return null;
      }

      // Check notebook format version
      if (parsed.nbformat && parsed.nbformat < NOTEBOOK_FORMATS.MIN_SUPPORTED) {
        console.warn(`Unsupported notebook format version: ${parsed.nbformat}`);
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse notebook JSON:', error);
      return null;
    }
  }

  private calculateCellDiffs(oldCells: NotebookCell[], newCells: NotebookCell[]): CellDiff[] {
    const cellDiffs: CellDiff[] = [];
    const maxLength = Math.max(oldCells.length, newCells.length);
    let globalLineOffset = 0;

    // Pre-allocate array for better performance
    cellDiffs.length = maxLength;

    for (let i = 0; i < maxLength; i++) {
      const oldCell = oldCells[i];
      const newCell = newCells[i];

      if (!oldCell && newCell) {
        // Cell added - only create source changes if needed
        cellDiffs[i] = {
          cellIndex: i,
          status: 'added',
          newCell,
          sourceChanges: this.createSourceDiffChunks([], newCell.source, globalLineOffset),
        };
      } else if (oldCell && !newCell) {
        // Cell deleted - only create source changes if needed
        cellDiffs[i] = {
          cellIndex: i,
          oldCellIndex: i,
          status: 'deleted',
          oldCell,
          sourceChanges: this.createSourceDiffChunks(oldCell.source, [], globalLineOffset),
        };
      } else if (oldCell && newCell) {
        // Cell potentially modified - use cached comparison
        cellDiffs[i] = this.compareCells(oldCell, newCell, i, globalLineOffset);
      }

      // Update global line offset based on the current cell's content
      if (newCell && newCell.source) {
        const sourceLines = Array.isArray(newCell.source) ? newCell.source.length : 1;
        globalLineOffset += sourceLines;
      } else if (oldCell && oldCell.source) {
        const sourceLines = Array.isArray(oldCell.source) ? oldCell.source.length : 1;
        globalLineOffset += sourceLines;
      }
    }

    // Filter out null entries and return
    return cellDiffs.filter(Boolean);
  }

  private compareCells(
    oldCell: NotebookCell,
    newCell: NotebookCell,
    index: number,
    globalLineOffset: number = 0
  ): CellDiff {
    const sourceChanged = !this.sourcesEqual(oldCell.source, newCell.source);
    const outputChanged = !this.outputsEqual(oldCell.outputs, newCell.outputs);
    const metadataChanged = !this.objectsEqual(oldCell.metadata, newCell.metadata);
    const executionCountChanged = oldCell.execution_count !== newCell.execution_count;

    const isChanged = sourceChanged || outputChanged || metadataChanged || executionCountChanged;

    let sourceChanges: DiffChunk[] | undefined;
    if (sourceChanged) {
      sourceChanges = this.createSourceDiffChunks(oldCell.source, newCell.source, globalLineOffset);
    }

    let outputChanges;
    let outputDiffChunks: DiffChunk[] | undefined;
    if (outputChanged) {
      outputChanges = this.createOutputChanges(oldCell.outputs, newCell.outputs);
      outputDiffChunks = this.createOutputDiffChunks(
        oldCell.outputs,
        newCell.outputs,
        globalLineOffset
      );
    }

    return {
      cellIndex: index,
      oldCellIndex: index,
      status: isChanged ? 'modified' : 'unchanged',
      oldCell,
      newCell,
      sourceChanges,
      outputChanges,
      outputDiffChunks,
      metadataChanged,
      executionCountChanged,
    };
  }

  private createSourceDiffChunks(
    oldSource: string[] | string,
    newSource: string[] | string,
    globalLineOffset: number = 0
  ): DiffChunk[] {
    const oldText = this.normalizeSource(oldSource);
    const newText = this.normalizeSource(newSource);

    if (oldText === newText && oldText === '') {
      return [];
    }

    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];
    const lines = this.createDiffLines(oldLines, newLines, globalLineOffset);

    return [
      {
        header: DIFF_CHUNK_HEADERS.SOURCE,
        oldStart: globalLineOffset + 1,
        oldLines: oldLines.length,
        newStart: globalLineOffset + 1,
        newLines: newLines.length,
        lines,
      },
    ];
  }

  private normalizeSource(source: string[] | string): string {
    return Array.isArray(source) ? source.join('\n') : String(source || '');
  }

  private createDiffLines(
    oldLines: string[],
    newLines: string[],
    globalLineOffset: number = 0
  ): DiffLine[] {
    const lines: DiffLine[] = [];
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined) {
        lines.push({
          type: 'add',
          content: newLine || '',
          newLineNumber: globalLineOffset + i + 1,
        });
      } else if (newLine === undefined) {
        lines.push({
          type: 'delete',
          content: oldLine,
          oldLineNumber: globalLineOffset + i + 1,
        });
      } else if (oldLine !== newLine) {
        lines.push(
          {
            type: 'delete',
            content: oldLine,
            oldLineNumber: globalLineOffset + i + 1,
          },
          {
            type: 'add',
            content: newLine,
            newLineNumber: globalLineOffset + i + 1,
          }
        );
      } else {
        lines.push({
          type: 'normal',
          content: oldLine,
          oldLineNumber: globalLineOffset + i + 1,
          newLineNumber: globalLineOffset + i + 1,
        });
      }
    }

    return lines;
  }

  private createOutputChanges(oldOutputs?: NotebookOutput[], newOutputs?: NotebookOutput[]) {
    const old = oldOutputs || [];
    const new_ = newOutputs || [];

    const added: NotebookOutput[] = [];
    const deleted: NotebookOutput[] = [];
    const modified: Array<{ old: NotebookOutput; new: NotebookOutput }> = [];

    // Simple comparison by index
    const maxLength = Math.max(old.length, new_.length);
    for (let i = 0; i < maxLength; i++) {
      const oldOutput = old[i];
      const newOutput = new_[i];

      if (!oldOutput && newOutput) {
        added.push(newOutput);
      } else if (oldOutput && !newOutput) {
        deleted.push(oldOutput);
      } else if (oldOutput && newOutput && !this.objectsEqual(oldOutput, newOutput)) {
        modified.push({ old: oldOutput, new: newOutput });
      }
    }

    return { added, deleted, modified };
  }

  private createOutputDiffChunks(
    oldOutputs?: NotebookOutput[],
    newOutputs?: NotebookOutput[],
    globalLineOffset: number = 0
  ): DiffChunk[] {
    const old = oldOutputs || [];
    const new_ = newOutputs || [];

    if (old.length === 0 && new_.length === 0) {
      return [];
    }

    const oldText = old.map((output) => this.formatOutputForDiff(output)).join('\n\n');
    const newText = new_.map((output) => this.formatOutputForDiff(output)).join('\n\n');

    if (oldText === newText) {
      return [];
    }

    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    // For output chunks, we add the source lines length to the offset
    const outputOffset =
      globalLineOffset + (oldLines.length > 0 ? oldLines.length : newLines.length);
    const lines = this.createDiffLines(oldLines, newLines, outputOffset);

    return [
      {
        header: DIFF_CHUNK_HEADERS.OUTPUT,
        oldStart: outputOffset + 1,
        oldLines: oldLines.length,
        newStart: outputOffset + 1,
        newLines: newLines.length,
        lines,
      },
    ];
  }

  private formatOutputForDiff(output: NotebookOutput): string {
    // Handle text output
    if (output.text) {
      return Array.isArray(output.text) ? output.text.join('') : output.text;
    }

    // Handle data output
    if (output.data) {
      const textData = output.data['text/plain'];
      if (textData) {
        return Array.isArray(textData) ? textData.join('') : textData;
      }
      return JSON.stringify(output.data, null, 2);
    }

    // Handle traceback (error output)
    if (output.traceback) {
      return Array.isArray(output.traceback) ? output.traceback.join('\n') : output.traceback;
    }

    // Fallback: stringify the entire output
    return JSON.stringify(output, null, 2);
  }

  private hasMetadataChanged(
    oldMetadata?: Record<string, any>,
    newMetadata?: Record<string, any>
  ): boolean {
    return !this.objectsEqual(oldMetadata, newMetadata);
  }

  private calculateStats(cellDiffs: CellDiff[]) {
    const stats = cellDiffs.reduce(
      (acc, diff) => {
        switch (diff.status) {
          case 'added':
            acc.totalCellsAdded++;
            break;
          case 'deleted':
            acc.totalCellsDeleted++;
            break;
          case 'modified':
            acc.totalCellsModified++;
            break;
        }
        return acc;
      },
      { totalCellsAdded: 0, totalCellsDeleted: 0, totalCellsModified: 0 }
    );

    return stats;
  }

  private sourcesEqual(a?: string[] | string, b?: string[] | string): boolean {
    return this.normalizeSource(a || '') === this.normalizeSource(b || '');
  }

  private outputsEqual(a?: NotebookOutput[], b?: NotebookOutput[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((output, index) => this.objectsEqual(output, b[index]));
  }

  private objectsEqual(a?: Record<string, any>, b?: Record<string, any>): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;

    try {
      // Sort keys to ensure consistent comparison
      const sortedA = this.sortObjectKeys(a);
      const sortedB = this.sortObjectKeys(b);
      return JSON.stringify(sortedA) === JSON.stringify(sortedB);
    } catch {
      return false;
    }
  }

  private sortObjectKeys(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = obj[key];
      });
    return sorted;
  }
}
