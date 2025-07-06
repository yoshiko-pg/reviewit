import { describe, it, expect } from 'vitest';

import { getFileExtension } from '../../utils/fileUtils';

import { isImageFile } from './imageUtils';

describe('imageUtils', () => {
  describe('isImageFile', () => {
    it('identifies common image extensions correctly', () => {
      const imageFiles = [
        'photo.jpg',
        'image.jpeg',
        'logo.png',
        'animation.gif',
        'bitmap.bmp',
        'vector.svg',
        'modern.webp',
        'favicon.ico',
        'photo.tiff',
        'picture.tif',
        'modern.avif',
        'mobile.heic',
        'camera.heif',
      ];

      imageFiles.forEach((filename) => {
        expect(isImageFile(filename)).toBe(true);
      });
    });

    it('handles case insensitive extensions', () => {
      const caseVariations = [
        'photo.JPG',
        'image.JPEG',
        'logo.PNG',
        'animation.GIF',
        'bitmap.BMP',
        'vector.SVG',
        'modern.WEBP',
        'favicon.ICO',
        'Photo.Jpg',
        'Image.Png',
      ];

      caseVariations.forEach((filename) => {
        expect(isImageFile(filename)).toBe(true);
      });
    });

    it('rejects non-image files', () => {
      const nonImageFiles = [
        'document.pdf',
        'script.js',
        'style.css',
        'data.json',
        'text.txt',
        'archive.zip',
        'video.mp4',
        'audio.mp3',
        'presentation.pptx',
        'spreadsheet.xlsx',
        'code.tsx',
        'config.yml',
      ];

      nonImageFiles.forEach((filename) => {
        expect(isImageFile(filename)).toBe(false);
      });
    });

    it('handles edge cases', () => {
      expect(isImageFile('')).toBe(false);
      expect(isImageFile('file')).toBe(false);
      expect(isImageFile('file.')).toBe(false);
      expect(isImageFile('.jpg')).toBe(true);
      expect(isImageFile('very.long.filename.with.multiple.dots.png')).toBe(true);
      expect(isImageFile('file.unknown')).toBe(false);
    });

    it('handles null and undefined inputs', () => {
      expect(isImageFile(null as any)).toBe(false);
      expect(isImageFile(undefined as any)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('extracts file extensions correctly', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('image.JPEG')).toBe('jpeg');
      expect(getFileExtension('logo.PNG')).toBe('png');
      expect(getFileExtension('animation.gif')).toBe('gif');
    });

    it('handles files with multiple dots', () => {
      expect(getFileExtension('my.backup.file.jpg')).toBe('jpg');
      expect(getFileExtension('config.dev.json')).toBe('json');
      expect(getFileExtension('test.component.tsx')).toBe('tsx');
    });

    it('handles edge cases', () => {
      expect(getFileExtension('')).toBe(null);
      expect(getFileExtension('file')).toBe('file'); // No dot, so whole filename is returned
      expect(getFileExtension('file.')).toBe(null); // Empty extension becomes null
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.')).toBe(null); // Empty extension becomes null
    });

    it('handles null and undefined inputs', () => {
      // TypeScript prevents these at compile time, but test runtime behavior
      expect(getFileExtension(null as any)).toBe(null);
      expect(getFileExtension(undefined as any)).toBe(null);
    });

    it('converts to lowercase', () => {
      expect(getFileExtension('PHOTO.JPG')).toBe('jpg');
      expect(getFileExtension('Image.PNG')).toBe('png');
      expect(getFileExtension('file.TXT')).toBe('txt');
    });
  });

  describe('Integration tests', () => {
    it('isImageFile uses getFileExtension correctly', () => {
      const testFiles = [
        { filename: 'photo.jpg', expected: true },
        { filename: 'document.pdf', expected: false },
        { filename: 'logo.PNG', expected: true },
        { filename: 'script.JS', expected: false },
        { filename: 'image.webp', expected: true },
      ];

      testFiles.forEach(({ filename, expected }) => {
        expect(isImageFile(filename)).toBe(expected);
      });
    });
  });
});
