// Content is read through this interface: fetch in the browser, the file system in
// Node tools and the server, an in-memory map in tests. Paths are relative to the
// content root (the folder that contains themes/ and locales/), with '/' separators.

export interface FileProvider {
  /** The file's text, or undefined when the file does not exist. */
  readText(path: string): Promise<string | undefined>;
  exists(path: string): Promise<boolean>;
}

/** Joins path segments with '/', resolving '.' and '..'. */
export function joinPath(...segments: string[]): string {
  const parts: string[] = [];
  for (const part of segments.join('/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

/** A provider over an in-memory map of path → text. */
export function memoryFileProvider(files: Readonly<Record<string, string>>): FileProvider {
  return {
    readText: async (path) => files[joinPath(path)],
    exists: async (path) => joinPath(path) in files,
  };
}
