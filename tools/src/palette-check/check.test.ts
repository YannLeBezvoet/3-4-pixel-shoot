import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseGpl } from '@pixel-shoot/content';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../paths';
import { checkImage, describeProblem } from './check';
import { runPaletteCheck } from './cli';

const palette = parseGpl(readFileSync(fromRoot('palette', 'resurrect-64.gpl'), 'utf8'));

/** 4×2 image: palette colors and transparency, plus optional bad pixels. */
function image(bad: { x: number; y: number; rgba: [number, number, number, number] }[] = []) {
  const png = new PNG({ width: 4, height: 2 });
  for (let i = 0; i < 8; i++) png.data.set(i % 2 ? [46, 34, 47, 255] : [255, 0, 0, 0], i * 4);
  for (const { x, y, rgba } of bad) png.data.set(rgba, (y * 4 + x) * 4);
  return png;
}

describe('checkImage', () => {
  it('accepts palette colors and fully transparent pixels of any color', () => {
    expect(checkImage(image(), palette)).toEqual([]);
  });

  it('reports an off-palette color with position, count and nearest color', () => {
    const problems = checkImage(image([{ x: 2, y: 1, rgba: [250, 250, 250, 255] }]), palette);
    expect(problems).toEqual([
      { kind: 'off-palette', hex: 'fafafa', count: 1, first: { x: 2, y: 1 }, nearest: 'ffffff' },
    ]);
    expect(describeProblem(problems[0]!)).toBe(
      'color #fafafa is not in the palette: 1 pixel, first at (2, 1). Nearest palette color: #ffffff.',
    );
  });

  it('reports semi-transparent pixels, even in palette colors', () => {
    const problems = checkImage(
      image([
        { x: 0, y: 0, rgba: [46, 34, 47, 128] },
        { x: 1, y: 0, rgba: [46, 34, 47, 128] },
      ]),
      palette,
    );
    expect(problems).toEqual([
      { kind: 'partial-alpha', alpha: 128, count: 2, first: { x: 0, y: 0 } },
    ]);
    expect(describeProblem(problems[0]!)).toContain('alpha 128 of 255): 2 pixels, first at (0, 0)');
  });
});

describe('runPaletteCheck', () => {
  it('prints the file, the problems and fails; passes on clean files', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'pixel-shoot-palette-'));
    try {
      const clean = path.join(dir, 'clean.png');
      const broken = path.join(dir, 'broken.png');
      await writeFile(clean, PNG.sync.write(image()));
      await writeFile(
        broken,
        PNG.sync.write(
          image([
            { x: 3, y: 0, rgba: [1, 2, 3, 255] },
            { x: 0, y: 1, rgba: [255, 255, 255, 200] },
          ]),
        ),
      );
      const lines: string[] = [];
      expect(await runPaletteCheck([clean], (l) => lines.push(l))).toBe(true);
      expect(await runPaletteCheck([clean, broken], (l) => lines.push(l))).toBe(false);
      const output = lines.join('\n');
      expect(output).toContain('broken.png');
      expect(output).not.toMatch(/✗ .*clean\.png/);
      expect(output).toContain('color #010203 is not in the palette: 1 pixel, first at (3, 0)');
      expect(output).toContain(
        'semi-transparent pixels (alpha 200 of 255): 1 pixel, first at (0, 1)',
      );
      expect(output).toContain('1 of 2 images break the Resurrect 64 palette rules.');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
