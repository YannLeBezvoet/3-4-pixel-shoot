// Checks that images only use palette colors and binary transparency (Q6).
import type { Palette } from '@pixel-shoot/content';
import { toHex } from '@pixel-shoot/content';

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  /** RGBA bytes, row by row. */
  readonly data: Uint8Array;
}

export type ImageProblem =
  | {
      readonly kind: 'off-palette';
      readonly hex: string;
      readonly count: number;
      readonly first: { readonly x: number; readonly y: number };
      readonly nearest: string;
    }
  | {
      readonly kind: 'partial-alpha';
      readonly alpha: number;
      readonly count: number;
      readonly first: { readonly x: number; readonly y: number };
    };

/** Lists the problems of one image, one entry per distinct bad color or alpha value. */
export function checkImage(image: RgbaImage, palette: Palette): ImageProblem[] {
  const offPalette = new Map<string, { count: number; x: number; y: number }>();
  const partialAlpha = new Map<number, { count: number; x: number; y: number }>();
  const { width, height, data } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] as number;
      if (a === 0) continue;
      if (a !== 255) {
        const entry = partialAlpha.get(a);
        if (entry) entry.count++;
        else partialAlpha.set(a, { count: 1, x, y });
        continue;
      }
      const r = data[i] as number;
      const g = data[i + 1] as number;
      const b = data[i + 2] as number;
      if (palette.has(r, g, b)) continue;
      const hex = toHex(r, g, b);
      const entry = offPalette.get(hex);
      if (entry) entry.count++;
      else offPalette.set(hex, { count: 1, x, y });
    }
  }
  const problems: ImageProblem[] = [];
  for (const [hex, { count, x, y }] of offPalette) {
    const value = Number.parseInt(hex, 16);
    const nearest = palette.nearest((value >> 16) & 255, (value >> 8) & 255, value & 255).hex;
    problems.push({ kind: 'off-palette', hex, count, first: { x, y }, nearest });
  }
  for (const [alpha, { count, x, y }] of partialAlpha) {
    problems.push({ kind: 'partial-alpha', alpha, count, first: { x, y } });
  }
  return problems;
}

export function describeProblem(problem: ImageProblem): string {
  const pixels = `${problem.count} pixel${problem.count === 1 ? '' : 's'}`;
  const at = `first at (${problem.first.x}, ${problem.first.y})`;
  return problem.kind === 'off-palette'
    ? `color #${problem.hex} is not in the palette: ${pixels}, ${at}. Nearest palette color: #${problem.nearest}.`
    : `semi-transparent pixels (alpha ${problem.alpha} of 255): ${pixels}, ${at}. Use fully opaque or fully transparent pixels.`;
}
