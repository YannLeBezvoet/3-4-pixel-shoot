import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listLanguages, listMaps, listThemes } from '../content/node-files';
import { repoRoot } from '../paths';
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

  it('validates the maps of a theme', async () => {
    const theme = path.join(root, 'themes', 'mapped');
    await mkdir(path.join(theme, 'maps'), { recursive: true });
    await mkdir(path.join(theme, 'locales'), { recursive: true });
    const repo = path.join(repoRoot, 'themes', 'vietnam');
    await cp(repo, theme, { recursive: true, filter: (p) => !p.includes(`${path.sep}maps`) });
    await writeFile(
      path.join(theme, 'theme.json'),
      (await readFile(path.join(repo, 'theme.json'), 'utf8')).replace('"vietnam"', '"mapped"'),
    );
    await writeFile(path.join(theme, 'maps', 'broken.tmj'), '{ "orientation": "hexagonal" }');
    expect(await listMaps('mapped', root)).toEqual(['maps/broken']);
    const lines: string[] = [];
    expect(await validateThemes(['mapped'], (l) => lines.push(l), root)).toBe(false);
    expect(lines.join('\n')).toContain('error: themes/mapped/maps/broken.tmj › width');
    expect(lines.at(-1)).toMatch(/^✗ mapped: \d+ errors?$/);
  });

  it('accepts the themes of the repository', async () => {
    const lines: string[] = [];
    expect(await validateThemes(await listThemes(), (l) => lines.push(l))).toBe(true);
    expect(lines).toContain('✓ vietnam: valid');
  });
});
