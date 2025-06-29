import { describe, it, expect } from 'vitest';
import { validateCommitish } from '../../src/cli/utils';

describe('CLI Utils', () => {
  describe('validateCommitish', () => {
    it('should validate full SHA hashes', () => {
      expect(validateCommitish('a1b2c3d4e5f6789012345678901234567890abcd')).toBe(true);
      expect(validateCommitish('abc123')).toBe(true);
    });

    it('should validate HEAD references', () => {
      expect(validateCommitish('HEAD')).toBe(true);
      expect(validateCommitish('HEAD~1')).toBe(true);
      expect(validateCommitish('HEAD~10')).toBe(true);
    });

    it('should validate branch names', () => {
      expect(validateCommitish('main')).toBe(true);
      expect(validateCommitish('feature/new-feature')).toBe(true);
      expect(validateCommitish('develop')).toBe(true);
    });

    it('should reject invalid input', () => {
      expect(validateCommitish('')).toBe(false);
      expect(validateCommitish('   ')).toBe(false);
      expect(validateCommitish('HEAD~')).toBe(false);
      expect(validateCommitish('abc')).toBe(true); // short hashes are valid
    });

    it('should reject non-string input', () => {
      expect(validateCommitish(null as any)).toBe(false);
      expect(validateCommitish(undefined as any)).toBe(false);
      expect(validateCommitish(123 as any)).toBe(false);
    });
  });
});
