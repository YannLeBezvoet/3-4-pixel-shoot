import type { IssueCollector } from '../issues/issues';
import type { FileProvider } from './file-provider';

/**
 * Reads and parses a JSON file. Reports a missing file (with what referenced it)
 * or invalid JSON, and returns undefined in both cases.
 */
export async function readJson(
  files: FileProvider,
  path: string,
  issues: IssueCollector,
  { referencedBy, hint }: { referencedBy?: string; hint?: string } = {},
): Promise<unknown> {
  const text = await files.readText(path);
  if (text === undefined) {
    const by = referencedBy ? ` (referenced by ${referencedBy})` : '';
    issues.error(path, '', `File not found${by}.${hint ? ` ${hint}` : ''}`);
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    issues.error(path, '', `Invalid JSON: ${(error as Error).message}`);
    return undefined;
  }
}
