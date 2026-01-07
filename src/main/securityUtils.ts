
/**
 * Checks if a file path has a valid image extension.
 * Used to prevent Path Traversal / LFI in custom protocol handlers.
 *
 * @param filePath The file path or URL to check
 * @returns true if the extension is allowed, false otherwise
 */
export function isValidImageExtension(filePath: string): boolean {
  // Security check: restrict allowed extensions to images
  const validExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".svg",
  ];

  const lowerPath = filePath.toLowerCase();
  return validExtensions.some((ext) => lowerPath.endsWith(ext));
}
