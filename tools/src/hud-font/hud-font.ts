// The HUD bitmap font (decision 0014): every glyph of the interface font rasterized at 8 px,
// one bit per pixel, white on transparent, so the HUD is pixel-exact and in palette (tinted to
// palette colors at runtime). The interface font's outlines sit on an 8-pixel grid, so the
// result is exact. Its name differs from the original: the OFL reserves "Press Start 2P".
import opentype from 'opentype.js';
import type { Font, PathCommand } from 'opentype.js';
import { PNG } from 'pngjs';

export const HUD_FONT_NAME = 'Pixel Shoot HUD';
export const HUD_FONT_PNG = 'apps/client/src/assets/fonts/hud-font.png';
export const HUD_FONT_JSON = 'apps/client/src/assets/fonts/hud-font.json';
export const CELL = 8;
const COLUMNS = 32;

export interface HudFontData {
  readonly name: string;
  readonly derivedFrom: string;
  /** Glyph cell and advance, in pixels (the font is monospaced). */
  readonly cell: number;
  readonly columns: number;
  /** Every character of the atlas, in atlas order: character i is at column i % columns. */
  readonly chars: string;
}

export function parseFont(buffer: Buffer): Font {
  return opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
  );
}

/** Polygons of a glyph path (only straight lines appear in a pixel font). */
function contours(commands: readonly PathCommand[]): { x: number; y: number }[][] {
  const result: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const command of commands) {
    if (command.type === 'M') {
      if (current.length > 0) result.push(current);
      current = [{ x: command.x!, y: command.y! }];
    } else if (command.type === 'Z') {
      if (current.length > 0) result.push(current);
      current = [];
    } else if (command.type === 'L') current.push({ x: command.x!, y: command.y! });
    else throw new Error(`Curved outlines cannot be rasterized exactly (command ${command.type}).`);
  }
  if (current.length > 0) result.push(current);
  return result;
}

/** Nonzero winding number of a point against polygons. */
function inside(polygons: readonly { x: number; y: number }[][], x: number, y: number): boolean {
  let winding = 0;
  for (const polygon of polygons)
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!;
      const b = polygon[(i + 1) % polygon.length]!;
      const cross = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
      if (a.y <= y && b.y > y && cross > 0) winding++;
      else if (a.y > y && b.y <= y && cross < 0) winding--;
    }
  return winding !== 0;
}

/** 8×8 pixels of a character, row by row; the baseline is the bottom of the cell. */
export function rasterize(font: Font, char: string): boolean[] {
  const polygons = contours(font.charToGlyph(char).getPath(0, CELL, CELL).commands);
  const pixels: boolean[] = [];
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < CELL; x++) pixels.push(inside(polygons, x + 0.5, y + 0.5));
  return pixels;
}

/** Characters the font draws: printable code points of the basic plane with a glyph. */
export function fontChars(font: Font): string {
  return Object.entries(font.tables.cmap.glyphIndexMap)
    .map(([code, glyph]) => ({ code: Number(code), glyph }))
    .filter(
      ({ code, glyph }) =>
        glyph > 0 && code >= 0x21 && code <= 0xffff && !(code >= 0x7f && code < 0xa0),
    )
    .sort((a, b) => a.code - b.code)
    .map(({ code }) => String.fromCodePoint(code))
    .join('');
}

export function buildHudFont(font: Font): { png: Buffer; json: string } {
  const chars = fontChars(font);
  const rows = Math.ceil(chars.length / COLUMNS);
  const png = new PNG({ width: COLUMNS * CELL, height: rows * CELL });
  [...chars].forEach((char, i) => {
    const pixels = rasterize(font, char);
    const ox = (i % COLUMNS) * CELL;
    const oy = Math.floor(i / COLUMNS) * CELL;
    pixels.forEach((on, p) => {
      if (!on) return;
      const index = ((oy + Math.floor(p / CELL)) * png.width + ox + (p % CELL)) * 4;
      png.data.set([255, 255, 255, 255], index);
    });
  });
  const data: HudFontData = {
    name: HUD_FONT_NAME,
    derivedFrom: `${font.getEnglishName('fontFamily') ?? 'interface font'} (SIL Open Font License 1.1)`,
    cell: CELL,
    columns: COLUMNS,
    chars,
  };
  return { png: PNG.sync.write(png, { colorType: 6 }), json: `${JSON.stringify(data, null, 2)}\n` };
}
