import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GitDiffParser } from './git-diff';

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({
    revparse: vi.fn(),
    diffSummary: vi.fn(),
    diff: vi.fn(),
  })),
}));

// Mock child_process
vi.mock('child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

describe('GitDiffParser', () => {
  let parser: GitDiffParser;
  let mockExecSync: any;
  let mockReadFileSync: any;

  beforeEach(async () => {
    parser = new GitDiffParser('/test/repo');
    vi.clearAllMocks();

    // Get mocked functions
    const childProcess = await import('child_process');
    const fs = await import('fs');
    mockExecSync = childProcess.execSync as any;
    mockReadFileSync = fs.readFileSync as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBlobContent', () => {
    it('reads from filesystem for working directory', async () => {
      const mockBuffer = Buffer.from('test content');
      mockReadFileSync.mockReturnValue(mockBuffer);

      const result = await parser.getBlobContent('test.txt', 'working');

      expect(mockReadFileSync).toHaveBeenCalledWith('test.txt');
      expect(result).toBe(mockBuffer);
    });

    it('reads from filesystem for "." ref', async () => {
      const mockBuffer = Buffer.from('test content');
      mockReadFileSync.mockReturnValue(mockBuffer);

      const result = await parser.getBlobContent('test.txt', '.');

      expect(mockReadFileSync).toHaveBeenCalledWith('test.txt');
      expect(result).toBe(mockBuffer);
    });

    it('uses git show for staged files', async () => {
      const mockBuffer = Buffer.from('staged content');
      mockExecSync.mockReturnValue(mockBuffer);

      const result = await parser.getBlobContent('test.txt', 'staged');

      expect(mockExecSync).toHaveBeenCalledWith('git show :test.txt', {
        maxBuffer: 10 * 1024 * 1024,
      });
      expect(result).toBe(mockBuffer);
    });

    it('uses git cat-file for git refs', async () => {
      const blobHash = 'abc123def456';
      const mockBuffer = Buffer.from('git content');

      mockExecSync
        .mockReturnValueOnce(blobHash + '\n') // First call for rev-parse
        .mockReturnValueOnce(mockBuffer); // Second call for cat-file

      const result = await parser.getBlobContent('test.txt', 'HEAD');

      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse "HEAD:test.txt"', {
        encoding: 'utf8',
      });
      expect(mockExecSync).toHaveBeenCalledWith(`git cat-file blob ${blobHash}`, {
        maxBuffer: 10 * 1024 * 1024,
      });
      expect(result).toBe(mockBuffer);
    });

    it('handles file size limit errors', async () => {
      const error = new Error('maxBuffer exceeded');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(parser.getBlobContent('large-file.jpg', 'HEAD')).rejects.toThrow(
        'Image file large-file.jpg is too large to display (over 10MB limit)'
      );
    });

    it('handles ENOBUFS errors', async () => {
      const error = new Error('ENOBUFS: buffer overflow');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(parser.getBlobContent('large-file.jpg', 'HEAD')).rejects.toThrow(
        'Image file large-file.jpg is too large to display (over 10MB limit)'
      );
    });

    it('handles general git errors', async () => {
      const error = new Error('fatal: Path does not exist');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(parser.getBlobContent('missing.txt', 'HEAD')).rejects.toThrow(
        'Failed to get blob content for missing.txt at HEAD: fatal: Path does not exist'
      );
    });
  });

  describe('parseFileBlock with binary files', () => {
    it('parses added binary file correctly', () => {
      const diffLines = [
        'diff --git a/image.jpg b/image.jpg',
        'new file mode 100644',
        'index 0000000..abc123',
        '--- /dev/null',
        '+++ b/image.jpg',
        'Binary files /dev/null and b/image.jpg differ',
      ];

      const summary = {
        insertions: 0,
        deletions: 0,
      };

      // Access private method for testing
      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result).toEqual({
        path: 'image.jpg',
        oldPath: undefined,
        status: 'added',
        additions: 0,
        deletions: 0,
        chunks: [], // Binary files should have empty chunks
      });
    });

    it('parses deleted binary file correctly', () => {
      const diffLines = [
        'diff --git a/old-image.png b/old-image.png',
        'deleted file mode 100644',
        'index abc123..0000000',
        '--- a/old-image.png',
        '+++ /dev/null',
        'Binary files a/old-image.png and /dev/null differ',
      ];

      const summary = {
        insertions: 0,
        deletions: 0,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result).toEqual({
        path: 'old-image.png',
        oldPath: undefined,
        status: 'deleted',
        additions: 0,
        deletions: 0,
        chunks: [],
      });
    });

    it('parses modified binary file correctly', () => {
      const diffLines = [
        'diff --git a/photo.jpg b/photo.jpg',
        'index abc123..def456 100644',
        '--- a/photo.jpg',
        '+++ b/photo.jpg',
        'Binary files a/photo.jpg and b/photo.jpg differ',
      ];

      const summary = {
        insertions: 0,
        deletions: 0,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result).toEqual({
        path: 'photo.jpg',
        oldPath: undefined,
        status: 'modified',
        additions: 0,
        deletions: 0,
        chunks: [],
      });
    });

    it('parses renamed binary file correctly', () => {
      const diffLines = [
        'diff --git a/old-name.gif b/new-name.gif',
        'similarity index 100%',
        'rename from old-name.gif',
        'rename to new-name.gif',
      ];

      const summary = {
        insertions: 0,
        deletions: 0,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result).toEqual({
        path: 'new-name.gif',
        oldPath: 'old-name.gif',
        status: 'renamed',
        additions: 0,
        deletions: 0,
        chunks: [],
      });
    });

    it('handles non-binary files normally', () => {
      const diffLines = [
        'diff --git a/script.js b/script.js',
        'index abc123..def456 100644',
        '--- a/script.js',
        '+++ b/script.js',
        '@@ -1,3 +1,4 @@',
        ' console.log("hello");',
        '+console.log("world");',
        ' // end',
      ];

      const summary = {
        insertions: 1,
        deletions: 0,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result).toEqual({
        path: 'script.js',
        oldPath: undefined,
        status: 'added',
        additions: 1,
        deletions: 0,
        chunks: expect.any(Array), // Should have parsed chunks
      });

      // Verify chunks were parsed
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].header).toBe('@@ -1,3 +1,4 @@');
    });

    it('detects added files using /dev/null indicator', () => {
      const diffLines = [
        'diff --git a/new-file.txt b/new-file.txt',
        'index 0000000..abc123 100644',
        '--- /dev/null',
        '+++ b/new-file.txt',
        '@@ -0,0 +1,2 @@',
        '+line 1',
        '+line 2',
      ];

      const summary = {
        insertions: 2,
        deletions: 0,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result.status).toBe('added');
    });

    it('detects deleted files using /dev/null indicator', () => {
      const diffLines = [
        'diff --git a/deleted-file.txt b/deleted-file.txt',
        'index abc123..0000000 100644',
        '--- a/deleted-file.txt',
        '+++ /dev/null',
        '@@ -1,2 +0,0 @@',
        '-line 1',
        '-line 2',
      ];

      const summary = {
        insertions: 0,
        deletions: 2,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result.status).toBe('deleted');
    });
  });

  describe('File status detection improvements', () => {
    it('prioritizes new file mode over other indicators', () => {
      const diffLines = [
        'diff --git a/test.txt b/test.txt',
        'new file mode 100644',
        'index 0000000..abc123',
        '--- a/test.txt', // This might confuse simple parsers
        '+++ b/test.txt',
      ];

      const summary = {
        insertions: 5,
        deletions: 0,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result.status).toBe('added');
    });

    it('prioritizes deleted file mode over other indicators', () => {
      const diffLines = [
        'diff --git a/test.txt b/test.txt',
        'deleted file mode 100644',
        'index abc123..0000000',
        '--- a/test.txt',
        '+++ b/test.txt', // This might confuse simple parsers
      ];

      const summary = {
        insertions: 0,
        deletions: 5,
      };

      const result = (parser as any).parseFileBlock(diffLines.join('\n'), summary);

      expect(result.status).toBe('deleted');
    });
  });
});
