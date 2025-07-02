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
      const validation = validateDiffArguments(targetCommitish, baseCommitish);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const [oldNotebook, newNotebook] = await this.getNotebookContents(
        targetCommitish,
        baseCommitish,
        filePath
      );

      const cellDiffs = this.calculateCellDiffs(oldNotebook?.cells || [], newNotebook?.cells || []);

      const metadataChanged = this.hasMetadataChanged(oldNotebook?.metadata, newNotebook?.metadata);

      const stats = this.calculateStats(cellDiffs);

      let status: NotebookDiffFile['status'] = 'modified';
      if (!oldNotebook && newNotebook) {
        status = 'added';
      } else if (oldNotebook && !newNotebook) {
        status = 'deleted';
      }

      return {
        path: filePath,
        status,
        cellDiffs,
        metadataChanged,
        ...stats,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse notebook diff for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getNotebookContents(
    targetCommitish: string,
    baseCommitish: string,
    filePath: string
  ): Promise<[NotebookData | null, NotebookData | null]> {
    let oldContent: string | null = null;
    let newContent: string | null = null;

    try {
      if (targetCommitish === 'working') {
        newContent = await this.git.show([`HEAD:${filePath}`]);
        try {
          const fs = await import('fs/promises');
          oldContent = await fs.readFile(filePath, 'utf-8');
        } catch {
          oldContent = null;
        }
      } else if (targetCommitish === 'staged') {
        oldContent = await this.git.show([`${baseCommitish}:${filePath}`]);
        newContent = await this.git.show([`:${filePath}`]);
      } else if (targetCommitish === '.') {
        oldContent = await this.git.show([`${baseCommitish}:${filePath}`]);
        try {
          const fs = await import('fs/promises');
          newContent = await fs.readFile(filePath, 'utf-8');
        } catch {
          newContent = null;
        }
      } else {
        oldContent = await this.git.show([`${baseCommitish}:${filePath}`]);
        newContent = await this.git.show([`${targetCommitish}:${filePath}`]);
      }
    } catch (error) {
      // Handle case where file doesn't exist in one of the commits
    }

    return [
      oldContent ? this.parseNotebookJson(oldContent) : null,
      newContent ? this.parseNotebookJson(newContent) : null,
    ];
  }

  private parseNotebookJson(content: string): NotebookData | null {
    try {
      return JSON.parse(content) as NotebookData;
    } catch (error) {
      console.error('Failed to parse notebook JSON:', error);
      return null;
    }
  }

  private calculateCellDiffs(oldCells: NotebookCell[], newCells: NotebookCell[]): CellDiff[] {
    const cellDiffs: CellDiff[] = [];

    // Simple approach: compare cells by index first, then detect insertions/deletions
    const maxLength = Math.max(oldCells.length, newCells.length);

    for (let i = 0; i < maxLength; i++) {
      const oldCell = oldCells[i];
      const newCell = newCells[i];

      if (!oldCell && newCell) {
        // Cell added - create source changes showing all lines as added
        const sourceChanges = this.createSourceDiffChunks([], newCell.source);
        cellDiffs.push({
          cellIndex: i,
          status: 'added',
          newCell,
          sourceChanges,
        });
      } else if (oldCell && !newCell) {
        // Cell deleted - create source changes showing all lines as deleted
        const sourceChanges = this.createSourceDiffChunks(oldCell.source, []);
        cellDiffs.push({
          cellIndex: i,
          oldCellIndex: i,
          status: 'deleted',
          oldCell,
          sourceChanges,
        });
      } else if (oldCell && newCell) {
        // Cell potentially modified
        const diff = this.compareCells(oldCell, newCell, i);
        cellDiffs.push(diff);
      }
    }

    return cellDiffs;
  }

  private compareCells(oldCell: NotebookCell, newCell: NotebookCell, index: number): CellDiff {
    const sourceChanged = !this.sourcesEqual(oldCell.source, newCell.source);
    const outputChanged = !this.outputsEqual(oldCell.outputs, newCell.outputs);
    const metadataChanged = !this.objectsEqual(oldCell.metadata, newCell.metadata);
    const executionCountChanged = oldCell.execution_count !== newCell.execution_count;

    const isChanged = sourceChanged || outputChanged || metadataChanged || executionCountChanged;

    let sourceChanges: DiffChunk[] | undefined;
    if (sourceChanged) {
      sourceChanges = this.createSourceDiffChunks(oldCell.source, newCell.source);
    }

    let outputChanges;
    let outputDiffChunks: DiffChunk[] | undefined;
    if (outputChanged) {
      outputChanges = this.createOutputChanges(oldCell.outputs, newCell.outputs);
      outputDiffChunks = this.createOutputDiffChunks(oldCell.outputs, newCell.outputs);
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
    newSource: string[] | string
  ): DiffChunk[] {
    // Create a unified diff-like structure for source code changes
    // Handle both string arrays and single strings
    const oldText = Array.isArray(oldSource) ? oldSource.join('\n') : String(oldSource || '');
    const newText = Array.isArray(newSource) ? newSource.join('\n') : String(newSource || '');

    if (oldText === newText && oldText === '') {
      return [];
    }

    // Simple implementation: create a single chunk showing all changes
    const lines: DiffLine[] = [];
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    // Basic line-by-line comparison
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined) {
        lines.push({
          type: 'add',
          content: newLine || '',
          newLineNumber: i + 1,
        });
      } else if (newLine === undefined) {
        lines.push({
          type: 'delete',
          content: oldLine,
          oldLineNumber: i + 1,
        });
      } else if (oldLine !== newLine) {
        lines.push({
          type: 'delete',
          content: oldLine,
          oldLineNumber: i + 1,
        });
        lines.push({
          type: 'add',
          content: newLine,
          newLineNumber: i + 1,
        });
      } else {
        lines.push({
          type: 'normal',
          content: oldLine,
          oldLineNumber: i + 1,
          newLineNumber: i + 1,
        });
      }
    }

    return [
      {
        header: '@@ Cell Source Changes @@',
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines,
      },
    ];
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
    newOutputs?: NotebookOutput[]
  ): DiffChunk[] {
    const old = oldOutputs || [];
    const new_ = newOutputs || [];

    if (old.length === 0 && new_.length === 0) {
      return [];
    }

    // Convert outputs to text for diff
    const oldText = old.map((output) => this.formatOutputForDiff(output)).join('\n\n');
    const newText = new_.map((output) => this.formatOutputForDiff(output)).join('\n\n');

    if (oldText === newText) {
      return [];
    }

    const lines: DiffLine[] = [];
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined) {
        lines.push({
          type: 'add',
          content: newLine || '',
          newLineNumber: i + 1,
        });
      } else if (newLine === undefined) {
        lines.push({
          type: 'delete',
          content: oldLine,
          oldLineNumber: i + 1,
        });
      } else if (oldLine !== newLine) {
        lines.push({
          type: 'delete',
          content: oldLine,
          oldLineNumber: i + 1,
        });
        lines.push({
          type: 'add',
          content: newLine,
          newLineNumber: i + 1,
        });
      } else {
        lines.push({
          type: 'normal',
          content: oldLine,
          oldLineNumber: i + 1,
          newLineNumber: i + 1,
        });
      }
    }

    return [
      {
        header: '@@ Output Changes @@',
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines,
      },
    ];
  }

  private formatOutputForDiff(output: NotebookOutput): string {
    if (output.text) {
      return Array.isArray(output.text) ? output.text.join('') : output.text;
    }
    if (output.data) {
      if (output.data['text/plain']) {
        const textData = output.data['text/plain'];
        return Array.isArray(textData) ? textData.join('') : textData;
      }
      return JSON.stringify(output.data, null, 2);
    }
    if (output.traceback) {
      return Array.isArray(output.traceback) ? output.traceback.join('\n') : output.traceback;
    }
    return JSON.stringify(output, null, 2);
  }

  private hasMetadataChanged(
    oldMetadata?: Record<string, any>,
    newMetadata?: Record<string, any>
  ): boolean {
    return !this.objectsEqual(oldMetadata, newMetadata);
  }

  private calculateStats(cellDiffs: CellDiff[]) {
    const totalCellsAdded = cellDiffs.filter((diff) => diff.status === 'added').length;
    const totalCellsDeleted = cellDiffs.filter((diff) => diff.status === 'deleted').length;
    const totalCellsModified = cellDiffs.filter((diff) => diff.status === 'modified').length;

    return {
      totalCellsAdded,
      totalCellsDeleted,
      totalCellsModified,
    };
  }

  private sourcesEqual(a?: string[] | string, b?: string[] | string): boolean {
    const aText = Array.isArray(a) ? a.join('\n') : String(a || '');
    const bText = Array.isArray(b) ? b.join('\n') : String(b || '');
    return aText === bText;
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
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
}
