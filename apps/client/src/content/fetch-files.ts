// Reads content over HTTP: the dev server serves the repository's themes/ and locales/,
// and the production build ships copies of them next to the page.
import type { ContentIndex, FileProvider, IssueCollector } from '@pixel-shoot/content';
import { CONTENT_INDEX_FILE, contentIndexSchema } from '@pixel-shoot/content';

export function fetchFileProvider(base: string = import.meta.env.BASE_URL): FileProvider {
  const url = (path: string) => `${base}${path}`;
  return {
    async readText(path) {
      const response = await fetch(url(path), { cache: 'no-store' });
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Cannot load ${path}: HTTP ${response.status}.`);
      return response.text();
    },
    async exists(path) {
      const response = await fetch(url(path), { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    },
  };
}

export async function loadContentIndex(
  files: FileProvider,
  issues: IssueCollector,
): Promise<ContentIndex> {
  const text = await files.readText(CONTENT_INDEX_FILE);
  const parsed = text === undefined ? undefined : contentIndexSchema.safeParse(JSON.parse(text));
  if (!parsed?.success) {
    issues.error(
      CONTENT_INDEX_FILE,
      '',
      'The content index is missing or invalid; is the client served by its Vite configuration?',
    );
    return { languages: [], themes: [] };
  }
  return parsed.data;
}
