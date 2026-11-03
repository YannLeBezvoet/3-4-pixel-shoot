import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root. */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Resolves a path relative to the repository root. */
export function fromRoot(...segments: string[]): string {
  return path.join(repoRoot, ...segments);
}
