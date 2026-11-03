import { CONTENT_INDEX_FILE as fromContent, contentIndexSchema } from '@pixel-shoot/content';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTENT_INDEX_FILE, buildContentIndex } from './content-plugin';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

describe('content plugin', () => {
  it('publishes the index under the name the client reads', () => {
    expect(CONTENT_INDEX_FILE).toBe(fromContent);
  });

  it('indexes the repository languages, themes and sprites', async () => {
    const index = contentIndexSchema.parse(await buildContentIndex(repoRoot));
    expect(index.languages).toEqual(expect.arrayContaining(['en', 'fr']));
    const vietnam = index.themes.find((t) => t.id === 'vietnam');
    expect(vietnam?.sprites).toEqual(
      expect.arrayContaining(['sprites/characters/us-rifleman', 'sprites/effects/explosion']),
    );
  });
});
