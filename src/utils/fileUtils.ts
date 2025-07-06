/**
 * Get file extension from filename or filepath
 * @param filename - The filename or filepath
 * @returns The file extension in lowercase, or null if no extension
 */
export function getFileExtension(filename: string): string | null {
  if (!filename) return null;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension || null;
}

/**
 * Get filename from filepath
 * @param filepath - The filepath
 * @returns The filename
 */
export function getFileName(filepath: string): string {
  if (!filepath) return '';
  return filepath.split('/').pop() || '';
}
