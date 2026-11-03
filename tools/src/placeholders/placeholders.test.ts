import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CHARACTER_SPRITE,
  IssueCollector,
  WEAPON_SPRITE,
  checkSpriteRequirements,
  formatIssues,
  parseGpl,
  parseSpriteSheet,
} from '@pixel-shoot/content';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkImage } from '../palette-check/check';
import { fromRoot, repoRoot } from '../paths';
import { catalog, generate, report } from './cli';

describe('placeholder catalog', () => {
  it('is deterministic', async () => {
    const first = await catalog(repoRoot);
    const second = await catalog(repoRoot);
    expect(second.map((f) => [f.path, f.content])).toEqual(first.map((f) => [f.path, f.content]));
  });

  it('only uses palette colors and binary transparency', async () => {
    const palette = parseGpl(await readFile(fromRoot('palette', 'resurrect-64.gpl'), 'utf8'));
    for (const file of (await catalog(repoRoot)).filter((f) => f.path.endsWith('.png'))) {
      const png = PNG.sync.read(file.content as Buffer);
      expect(checkImage(png, palette), file.path).toEqual([]);
    }
  });

  it('follows the sprite conventions of characters and weapons', async () => {
    for (const file of (await catalog(repoRoot)).filter((f) => f.path.endsWith('.json'))) {
      const issues = new IssueCollector();
      const sheet = parseSpriteSheet(JSON.parse(String(file.content)), file.path, issues);
      expect(sheet, formatIssues(issues.issues)).toBeDefined();
      if (file.path.includes('/characters/'))
        checkSpriteRequirements(sheet!, CHARACTER_SPRITE, file.path, issues);
      if (file.path.includes('/weapons/'))
        checkSpriteRequirements(sheet!, WEAPON_SPRITE, file.path, issues);
      expect(formatIssues(issues.issues), file.path).toBe('');
    }
  });
});

describe('generate', () => {
  let root = '';
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pixel-shoot-placeholders-'));
    await mkdir(path.join(root, 'palette'));
    await mkdir(path.join(root, 'tools'));
    await copyFile(
      fromRoot('palette', 'resurrect-64.gpl'),
      path.join(root, 'palette', 'resurrect-64.gpl'),
    );
  });
  afterEach(async () => rm(root, { recursive: true, force: true }));

  const art = 'themes/vietnam/sprites/weapons/m16a1.png';

  it('writes every file, then reports them all as placeholders', async () => {
    await generate(root);
    const rows = await report(root);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === 'placeholder')).toBe(true);
  });

  it('never overwrites a file replaced by real art, unless forced', async () => {
    await generate(root);
    await writeFile(path.join(root, art), 'real art');
    const log: string[] = [];
    await generate(root, {}, (line) => log.push(line));
    expect(log).toEqual([`kept ${art} (replaced by real art)`]);
    expect(await readFile(path.join(root, art), 'utf8')).toBe('real art');
    expect((await report(root)).find((r) => r.path === art)?.status).toBe('replaced');

    await generate(root, { force: true });
    expect((await report(root)).find((r) => r.path === art)?.status).toBe('placeholder');
  });

  it('restores a deleted placeholder', async () => {
    await generate(root);
    await rm(path.join(root, art));
    expect((await report(root)).find((r) => r.path === art)?.status).toBe('missing');
    await generate(root);
    expect((await report(root)).find((r) => r.path === art)?.status).toBe('placeholder');
  });
});
