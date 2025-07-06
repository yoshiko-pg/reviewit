/**
 * Image file utilities
 */

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'tif'];

/**
 * Check if a file is an image based on its extension
 */
export function isImageFile(filename: string): boolean {
  if (!filename) return false;

  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.includes(extension) : false;
}

/**
 * Get the file extension from a filename
 */
export function getFileExtension(filename: string): string | null {
  if (!filename) return null;

  const extension = filename.split('.').pop()?.toLowerCase();
  return extension || null;
}
