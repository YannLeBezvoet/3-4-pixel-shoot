import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CHARACTER_SPRITE,
  EFFECT_SPRITE,
  IssueCollector,
  PROJECTILE_SPRITE,
  WEAPON_SPRITE,
  checkSpriteRequirements,
  formatIssues,
  loadMap,
  loadTheme,
  memoryFileProvider,
  parseGpl,
  parseSpriteSheet,
} from '@pixel-shoot/content';
import { BLOCKS_MOVEMENT, TILE_SIZE, buildCollisionGrid, builtInBehaviors } from '@pixel-shoot/sim';
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

  it('follows the sprite conventions of characters, weapons, projectiles and effects', async () => {
    for (const file of (await catalog(repoRoot)).filter(
      (f) => f.path.includes('/sprites/') && f.path.endsWith('.json'),
    )) {
      const issues = new IssueCollector();
      const sheet = parseSpriteSheet(JSON.parse(String(file.content)), file.path, issues);
      expect(sheet, formatIssues(issues.issues)).toBeDefined();
      if (file.path.includes('/characters/'))
        checkSpriteRequirements(sheet!, CHARACTER_SPRITE, file.path, issues);
      if (file.path.includes('/weapons/'))
        checkSpriteRequirements(sheet!, WEAPON_SPRITE, file.path, issues);
      if (file.path.includes('/projectiles/'))
        checkSpriteRequirements(sheet!, PROJECTILE_SPRITE, file.path, issues);
      if (file.path.includes('/effects/'))
        checkSpriteRequirements(sheet!, EFFECT_SPRITE, file.path, issues);
      expect(formatIssues(issues.issues), file.path).toBe('');
    }
  });

  it('generates a playable Vietnam map: valid, roomy spawn areas joined by walkable ground', async () => {
    const files = new Map<string, string>();
    for (const file of await catalog(repoRoot))
      if (!file.path.endsWith('.png')) files.set(file.path, String(file.content));
    // The map is read with the theme files of the repository, and the generated map and tilesets.
    for (const name of ['theme', 'characters', 'weapons', 'projectiles', 'effects', 'locales/en'])
      files.set(
        `themes/vietnam/${name}.json`,
        await readFile(fromRoot(`themes/vietnam/${name}.json`), 'utf8'),
      );
    const provider = memoryFileProvider(Object.fromEntries(files));
    const exists = { ...provider, exists: async () => true };
    const { theme } = await loadTheme(exists, 'vietnam', {
      behaviors: builtInBehaviors,
      languages: ['en'],
    });
    const { map, issues } = await loadMap(exists, theme!, 'maps/river-village');
    expect(formatIssues(issues)).toBe('');
    expect(map).toMatchObject({ width: 80, height: 60 });

    const grid = buildCollisionGrid(map!);
    const free = (tx: number, ty: number) =>
      (grid.flagsAt(tx, ty) & BLOCKS_MOVEMENT) === 0 &&
      grid.footprintsAt(tx, ty).every((f) => (f.flags & BLOCKS_MOVEMENT) === 0);
    const tilesOf = (team: number) =>
      map!.spawns
        .filter((s) => s.team === team)
        .flatMap((s) =>
          Array.from({ length: (s.width / TILE_SIZE) * (s.height / TILE_SIZE) }, (_, i) => ({
            x: s.x / TILE_SIZE + (i % (s.width / TILE_SIZE)),
            y: s.y / TILE_SIZE + Math.floor(i / (s.width / TILE_SIZE)),
          })),
        )
        .filter((t) => free(t.x, t.y));
    expect(tilesOf(1).length).toBeGreaterThanOrEqual(8);
    expect(tilesOf(2).length).toBeGreaterThanOrEqual(8);

    // Walk from team 1's area: team 2's area must be reachable (over a bridge or the ford).
    const seen = new Set<number>();
    const queue = [tilesOf(1)[0]!];
    while (queue.length > 0) {
      const { x, y } = queue.pop()!;
      const key = y * map!.width + x;
      if (seen.has(key) || !free(x, y)) continue;
      seen.add(key);
      queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
    expect(tilesOf(2).every((t) => seen.has(t.y * map!.width + t.x))).toBe(true);
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
