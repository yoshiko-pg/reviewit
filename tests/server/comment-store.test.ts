import { describe, it, expect, beforeEach } from 'vitest';
import { CommentStore } from '../../src/server/comment-store';

describe('CommentStore', () => {
  let store: CommentStore;

  beforeEach(() => {
    store = new CommentStore('test-session');
  });

  describe('addComment', () => {
    it('should add a comment and return it', async () => {
      const comment = await store.addComment('src/test.ts', 42, 'Test comment');

      expect(comment.file).toBe('src/test.ts');
      expect(comment.line).toBe(42);
      expect(comment.body).toBe('Test comment');
      expect(comment.id).toBeDefined();
      expect(comment.timestamp).toBeDefined();
    });

    it.skip('should generate unique IDs for comments', async () => {
      const comment1 = await store.addComment('src/test.ts', 42, 'Comment 1');
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamps
      const comment2 = await store.addComment('src/test.ts', 42, 'Comment 2');

      expect(comment1.id).not.toBe(comment2.id);
    });
  });

  describe('getComments', () => {
    it('should return all comments', async () => {
      await store.addComment('src/test.ts', 42, 'Comment 1');
      await store.addComment('src/other.ts', 10, 'Comment 2');

      const comments = await store.getComments();
      expect(comments).toHaveLength(2);
    });
  });

  describe('getCommentsForFile', () => {
    it('should return comments for specific file', async () => {
      await store.addComment('src/test.ts', 42, 'Comment 1');
      await store.addComment('src/other.ts', 10, 'Comment 2');
      await store.addComment('src/test.ts', 50, 'Comment 3');

      const comments = await store.getCommentsForFile('src/test.ts');
      expect(comments).toHaveLength(2);
      expect(comments.every((c) => c.file === 'src/test.ts')).toBe(true);
    });
  });

  describe('generatePrompt', () => {
    it('should generate a properly formatted prompt', async () => {
      const comment = await store.addComment('src/test.ts', 42, 'Fix this bug');
      const diffContent = '+  const foo = "bar";\n-  const foo = "baz";';

      const prompt = store.generatePrompt(comment, diffContent);

      expect(prompt).toContain('📄 src/test.ts L42');
      expect(prompt).toContain('Fix this bug');
      expect(prompt).toContain('----');
    });
  });
});
