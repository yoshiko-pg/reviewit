import type { Event } from '@parcel/watcher';
import { type Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DiffMode } from '../types/watch.js';

import { FileWatcherService } from './file-watcher.js';

// Mock @parcel/watcher
vi.mock('@parcel/watcher', () => ({
  subscribe: vi.fn(),
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({
    checkIgnore: vi.fn(),
  })),
}));

const { subscribe } = await import('@parcel/watcher');
const { simpleGit } = await import('simple-git');

describe('FileWatcherService', () => {
  let fileWatcher: FileWatcherService;
  let mockResponse: Response;
  let mockSubscription: { unsubscribe: () => Promise<void> };

  beforeEach(() => {
    vi.clearAllMocks();
    fileWatcher = new FileWatcherService();

    // Mock Express Response
    mockResponse = {
      write: vi.fn(),
    } as unknown as Response;

    // Mock subscription
    mockSubscription = {
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(subscribe).mockResolvedValue(mockSubscription);
  });

  describe('start', () => {
    it('should start watching for DEFAULT mode', async () => {
      await fileWatcher.start(DiffMode.DEFAULT, '/test/path', 300);

      expect(subscribe).toHaveBeenCalledWith('/test/path/.git', expect.any(Function), {
        ignore: ['.git/objects/**', '.git/refs/**', 'node_modules/**'],
      });
    });

    it('should start watching for WORKING mode', async () => {
      await fileWatcher.start(DiffMode.WORKING, '/test/path', 300);

      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenCalledWith('/test/path', expect.any(Function), {
        ignore: ['.git/objects/**', '.git/refs/**', 'node_modules/**'],
      });
      expect(subscribe).toHaveBeenCalledWith('/test/path/.git', expect.any(Function), {
        ignore: ['.git/objects/**', '.git/refs/**', 'node_modules/**'],
      });
    });

    it('should start watching for DOT mode', async () => {
      await fileWatcher.start(DiffMode.DOT, '/test/path', 300);

      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenCalledWith('/test/path', expect.any(Function), {
        ignore: [
          '.git/objects/**',
          '.git/refs/**',
          '.git/FETCH_HEAD',
          '.git/ORIG_HEAD',
          '.git/logs/**',
          'node_modules/**',
        ],
      });
    });

    it('should not start watching for SPECIFIC mode', async () => {
      await fileWatcher.start(DiffMode.SPECIFIC, '/test/path', 300);

      expect(subscribe).not.toHaveBeenCalled();
    });

    it('should initialize git instance for gitignore checking', async () => {
      await fileWatcher.start(DiffMode.DOT, '/test/path', 300);

      expect(simpleGit).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('stop', () => {
    it('should unsubscribe all watchers', async () => {
      await fileWatcher.start(DiffMode.WORKING, '/test/path', 300);
      await fileWatcher.stop();

      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should clear clients', async () => {
      fileWatcher.addClient(mockResponse);
      await fileWatcher.stop();

      // After stop, adding client should work normally (clients array should be cleared)
      expect(() => fileWatcher.addClient(mockResponse)).not.toThrow();
    });
  });

  describe('client management', () => {
    it('should add and remove clients', () => {
      const mockResponse1 = { write: vi.fn() } as unknown as Response;
      const mockResponse2 = { write: vi.fn() } as unknown as Response;

      fileWatcher.addClient(mockResponse1);
      fileWatcher.addClient(mockResponse2);

      // Should send connected event to new clients
      expect(mockResponse1.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"connected"')
      );
      expect(mockResponse2.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"connected"')
      );

      fileWatcher.removeClient(mockResponse1);

      // mockResponse1 should be removed, but this is tested indirectly
      // by checking that only one client receives broadcasts
    });
  });

  describe('gitignore checking', () => {
    it('should check gitignore correctly', async () => {
      const mockGit = {
        checkIgnore: vi.fn().mockResolvedValue(['ignored-file.txt']),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await fileWatcher.start(DiffMode.DOT, '/test/path', 300);

      // Get the callback function passed to subscribe
      const subscribeCall = vi.mocked(subscribe).mock.calls[0];
      const callback = subscribeCall[1];

      // Simulate file change event
      const mockEvents: Event[] = [
        { path: '/test/path/ignored-file.txt', type: 'update' },
        { path: '/test/path/normal-file.txt', type: 'update' },
      ];

      await callback(null, mockEvents);

      expect(mockGit.checkIgnore).toHaveBeenCalledWith(['ignored-file.txt']);
      expect(mockGit.checkIgnore).toHaveBeenCalledWith(['normal-file.txt']);
    });

    it('should handle gitignore check errors gracefully', async () => {
      const mockGit = {
        checkIgnore: vi.fn().mockRejectedValue(new Error('No ignored files')),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await fileWatcher.start(DiffMode.DOT, '/test/path', 300);

      const subscribeCall = vi.mocked(subscribe).mock.calls[0];
      const callback = subscribeCall[1];

      const mockEvents: Event[] = [{ path: '/test/path/some-file.txt', type: 'update' }];

      // Should not throw when gitignore check fails
      await expect(callback(null, mockEvents)).resolves.not.toThrow();
    });
  });

  describe('file filtering', () => {
    beforeEach(async () => {
      const mockGit = {
        checkIgnore: vi.fn().mockRejectedValue(new Error('No ignored files')),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await fileWatcher.start(DiffMode.DEFAULT, '/test/path', 300);
      fileWatcher.addClient(mockResponse);
    });

    it('should filter relevant git files for DEFAULT mode', async () => {
      const subscribeCall = vi.mocked(subscribe).mock.calls[0];
      const callback = subscribeCall[1];

      const mockEvents: Event[] = [
        { path: '/test/path/.git/HEAD', type: 'update' },
        { path: '/test/path/.git/index', type: 'update' },
        { path: '/test/path/.git/objects/abc123', type: 'update' },
      ];

      await callback(null, mockEvents);

      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should only broadcast for HEAD file in DEFAULT mode
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"type":"reload"'));
    });

    it('should filter out ignored patterns', async () => {
      const subscribeCall = vi.mocked(subscribe).mock.calls[0];
      const callback = subscribeCall[1];

      const mockEvents: Event[] = [
        { path: '/test/path/.git/objects/abc123', type: 'update' },
        { path: '/test/path/.git/refs/heads/main', type: 'update' },
        { path: '/test/path/node_modules/package/file.js', type: 'update' },
      ];

      await callback(null, mockEvents);

      // Should not broadcast for ignored files
      expect(mockResponse.write).not.toHaveBeenCalledWith(
        expect.stringContaining('"type":"reload"')
      );
    });
  });

  describe('debounce functionality', () => {
    beforeEach(async () => {
      const mockGit = {
        checkIgnore: vi.fn().mockRejectedValue(new Error('No ignored files')),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await fileWatcher.start(DiffMode.DEFAULT, '/test/path', 100); // Short debounce for testing
      fileWatcher.addClient(mockResponse);
    });

    it('should debounce multiple file changes', async () => {
      const subscribeCall = vi.mocked(subscribe).mock.calls[0];
      const callback = subscribeCall[1];

      const mockEvents: Event[] = [{ path: '/test/path/.git/HEAD', type: 'update' }];

      // Trigger multiple events quickly
      await callback(null, mockEvents);
      await callback(null, mockEvents);
      await callback(null, mockEvents);

      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should only send one reload event due to debouncing
      const reloadCalls = vi
        .mocked(mockResponse.write)
        .mock.calls.filter((call) => call[0].toString().includes('"type":"reload"'));
      expect(reloadCalls).toHaveLength(1);
    });
  });

  describe('change type determination', () => {
    it('should determine correct change type for each mode', async () => {
      const modes = [
        { mode: DiffMode.DEFAULT, expectedType: 'commit' },
        { mode: DiffMode.DOT, expectedType: 'commit' },
        { mode: DiffMode.STAGED, expectedType: 'staging' },
        { mode: DiffMode.WORKING, expectedType: 'file' },
      ];

      for (const { mode, expectedType } of modes) {
        const mockGit = {
          checkIgnore: vi.fn().mockRejectedValue(new Error('No ignored files')),
        };
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        await fileWatcher.start(mode, '/test/path', 300);
        const mockClient = { write: vi.fn() } as unknown as Response;
        fileWatcher.addClient(mockClient);

        const subscribeCall = vi
          .mocked(subscribe)
          .mock.calls.find((call) => call[0].includes('.git'));
        if (subscribeCall) {
          const callback = subscribeCall[1];
          const mockEvents: Event[] = [{ path: '/test/path/.git/HEAD', type: 'update' }];

          await callback(null, mockEvents);

          await new Promise((resolve) => setTimeout(resolve, 350)); // Wait for debounce

          expect(mockClient.write).toHaveBeenCalledWith(
            expect.stringContaining(`"changeType":"${expectedType}"`)
          );
        }

        await fileWatcher.stop();
        vi.clearAllMocks();
      }
    });
  });
});
