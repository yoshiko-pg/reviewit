import { describe, it, expect } from 'vitest';

import { detectWords, isValidWord, normalizeWord } from './wordDetection';

describe('wordDetection', () => {
  describe('detectWords', () => {
    it('should detect simple words', () => {
      const text = 'hello world';
      const words = detectWords(text);
      expect(words).toEqual([
        { word: 'hello', start: 0, end: 5 },
        { word: 'world', start: 6, end: 11 },
      ]);
    });

    it('should detect words with numbers and underscores', () => {
      const text = 'variable_1 test2 _private';
      const words = detectWords(text);
      expect(words).toEqual([
        { word: 'variable_1', start: 0, end: 10 },
        { word: 'test2', start: 11, end: 16 },
        { word: '_private', start: 17, end: 25 },
      ]);
    });

    it('should skip special characters', () => {
      const text = 'hello, world! foo.bar';
      const words = detectWords(text);
      expect(words).toEqual([
        { word: 'hello', start: 0, end: 5 },
        { word: 'world', start: 7, end: 12 },
        { word: 'foo', start: 14, end: 17 },
        { word: 'bar', start: 18, end: 21 },
      ]);
    });

    it('should return empty array for empty string', () => {
      expect(detectWords('')).toEqual([]);
    });

    it('should return empty array for only special characters', () => {
      expect(detectWords('!@#$%^&*()')).toEqual([]);
    });
  });

  describe('isValidWord', () => {
    it('should accept valid words', () => {
      expect(isValidWord('hello')).toBe(true);
      expect(isValidWord('test123')).toBe(true);
      expect(isValidWord('_private')).toBe(true);
      expect(isValidWord('CONSTANT')).toBe(true);
    });

    it('should reject words that are too short', () => {
      expect(isValidWord('a')).toBe(false);
      expect(isValidWord('ab')).toBe(true);
    });

    it('should reject words that are too long', () => {
      const longWord = 'a'.repeat(101);
      expect(isValidWord(longWord)).toBe(false);

      const maxLengthWord = 'a'.repeat(100);
      expect(isValidWord(maxLengthWord)).toBe(true);
    });

    it('should reject common keywords to avoid noise', () => {
      expect(isValidWord('if')).toBe(false);
      expect(isValidWord('for')).toBe(false);
      expect(isValidWord('var')).toBe(false);
      expect(isValidWord('let')).toBe(false);
    });
  });

  describe('normalizeWord', () => {
    it('should convert to lowercase', () => {
      expect(normalizeWord('Hello')).toBe('hello');
      expect(normalizeWord('WORLD')).toBe('world');
      expect(normalizeWord('camelCase')).toBe('camelcase');
    });

    it('should preserve underscores and numbers', () => {
      expect(normalizeWord('test_123')).toBe('test_123');
      expect(normalizeWord('_private')).toBe('_private');
    });
  });
});
