import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listLanguages, listThemes } from '../content/node-files';
import { validateThemes } from './cli';

describe('validateThemes', () => {
  let root = '';
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pixel-shoot-themes-'));
    await mkdir(path.join(root, 'themes', 'broken'), { recursive: true });
    await mkdir(path.join(root, 'themes', 'not-a-theme'), { recursive: true });
    await mkdir(path.join(root, 'locales'), { recursive: true });
    await writeFile(path.join(root, 'locales', 'en.json'), '{}');
    await writeFile(path.join(root, 'themes', 'broken', 'theme.json'), '{ "formatVersion": 9 }');
  });
  afterAll(async () => rm(root, { recursive: true, force: true }));

  it('finds themes and interface languages on disk', async () => {
    expect(await listThemes(root)).toEqual(['broken']);
    expect(await listLanguages(root)).toEqual(['en']);
  });

  it('prints every problem and fails when a theme has errors', async () => {
    const lines: string[] = [];
    expect(await validateThemes(['broken'], (l) => lines.push(l), root)).toBe(false);
    expect(lines.join('\n')).toBe(
      'error: themes/broken/theme.json › formatVersion\n  Unsupported formatVersion 9. This version of the game reads formatVersion 1.\n✗ broken: 1 error',
    );
  });
});
