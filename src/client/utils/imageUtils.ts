/**
 * Image file utilities
 */

import { getFileExtension } from '../../utils/fileUtils';

const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'svg',
  'webp',
  'ico',
  'tiff',
  'tif',
  'avif',
  'heic',
  'heif',
];

/**
 * Check if a file is an image based on its extension
 */
export function isImageFile(filename: string): boolean {
  if (!filename) return false;

  const extension = getFileExtension(filename);
  return extension ? IMAGE_EXTENSIONS.includes(extension) : false;
}
