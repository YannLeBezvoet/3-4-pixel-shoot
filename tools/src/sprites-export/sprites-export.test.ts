import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportArguments, findAsepriteFiles } from './cli';

describe('sprites:export', () => {
  it('exports next to the source, untrimmed, as a JSON array with tags and slices', () => {
    expect(exportArguments('/t/sprites/soldier.aseprite')).toEqual([
      '-b',
      '/t/sprites/soldier.aseprite',
      '--sheet',
      '/t/sprites/soldier.png',
      '--sheet-type',
      'packed',
      '--data',
      '/t/sprites/soldier.json',
      '--format',
      'json-array',
      '--list-tags',
      '--list-slices',
    ]);
  });

  it('finds .aseprite and .ase files in nested folders', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'pixel-shoot-ase-'));
    try {
      await mkdir(path.join(dir, 'a', 'b'), { recursive: true });
      await writeFile(path.join(dir, 'a', 'one.aseprite'), '');
      await writeFile(path.join(dir, 'a', 'b', 'two.ase'), '');
      await writeFile(path.join(dir, 'a', 'b', 'two.png'), '');
      expect(await findAsepriteFiles(dir)).toEqual([
        path.join(dir, 'a', 'b', 'two.ase'),
        path.join(dir, 'a', 'one.aseprite'),
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
