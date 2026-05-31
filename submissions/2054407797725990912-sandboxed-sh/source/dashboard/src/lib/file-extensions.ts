/**
 * Shared file extension constants for preview and file type detection.
 * Centralized to avoid duplication and ensure consistency.
 */

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];

export const CODE_EXTENSIONS = [
  ".sh", ".py", ".js", ".ts", ".tsx", ".jsx", ".rs", ".go",
  ".html", ".css", ".json", ".yaml", ".yml", ".xml"
];

export const TEXT_PREVIEW_EXTENSIONS = [
  ".txt", ".md", ".markdown", ".log",
  ".json", ".yaml", ".yml", ".toml", ".xml", ".csv", ".tsv"
];

export const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".gz"];

export const MEDIA_EXTENSIONS = [".mp4", ".mp3", ".wav", ".mov"];

export const FILE_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ".pdf",
  ...TEXT_PREVIEW_EXTENSIONS.filter(ext => !IMAGE_EXTENSIONS.includes(ext)),
  ...CODE_EXTENSIONS.filter(ext => !TEXT_PREVIEW_EXTENSIONS.includes(ext) && !IMAGE_EXTENSIONS.includes(ext)),
  ...ARCHIVE_EXTENSIONS,
  ...MEDIA_EXTENSIONS,
];

/**
 * Regex pattern for matching image file paths in text.
 * Matches absolute paths or relative paths ending in image extensions.
 */
export const IMAGE_PATH_PATTERN = new RegExp(
  `(?:\\/[\\w\\-._/]+|[\\w\\-._]+\\/[\\w\\-._/]+)\\.(${IMAGE_EXTENSIONS.map(e => e.slice(1)).join('|')})\\b`,
  'gi'
);

export function isImageFile(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function isMarkdownFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

export function isTextPreviewableFile(path: string): boolean {
  const lower = path.toLowerCase();
  return TEXT_PREVIEW_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function isCodeFile(path: string): boolean {
  const lower = path.toLowerCase();
  return CODE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function isArchiveFile(path: string): boolean {
  const lower = path.toLowerCase();
  return ARCHIVE_EXTENSIONS.some(ext => lower.endsWith(ext));
}
