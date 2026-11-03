// The game palette (Resurrect 64), read from a GIMP palette file (.gpl).

export interface PaletteColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** Lowercase hexadecimal without '#', e.g. "2e222f". */
  readonly hex: string;
}

export interface Palette {
  readonly name: string;
  readonly colors: readonly PaletteColor[];
  has(r: number, g: number, b: number): boolean;
  /** The perceptually closest palette color (weighted "redmean" RGB distance). */
  nearest(r: number, g: number, b: number): PaletteColor;
}

export function toHex(r: number, g: number, b: number): string {
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function createPalette(name: string, colors: readonly PaletteColor[]): Palette {
  if (colors.length === 0) throw new Error(`Palette "${name}" has no colors.`);
  const keys = new Set(colors.map((c) => (c.r << 16) | (c.g << 8) | c.b));
  return {
    name,
    colors,
    has: (r, g, b) => keys.has((r << 16) | (g << 8) | b),
    nearest(r, g, b) {
      let best = colors[0] as PaletteColor;
      let bestDistance = Infinity;
      for (const c of colors) {
        const meanR = (r + c.r) / 2;
        const dr = r - c.r;
        const dg = g - c.g;
        const db = b - c.b;
        const distance =
          (2 + meanR / 256) * dr * dr + 4 * dg * dg + (2 + (255 - meanR) / 256) * db * db;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = c;
        }
      }
      return best;
    },
  };
}

/**
 * Parses a GIMP palette. Color lines are "R G B [name]"; comments start with '#';
 * the palette name comes from a "Name:" line or a "#Palette Name:" comment.
 */
export function parseGpl(text: string): Palette {
  const lines = text.split(/\r?\n/);
  if (!lines[0]?.trim().startsWith('GIMP Palette')) {
    throw new Error('Not a GIMP palette: the first line must be "GIMP Palette".');
  }
  let name = 'Unnamed palette';
  const colors: PaletteColor[] = [];
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    const nameMatch = /^#?\s*(?:Palette\s+)?Name:\s*(.+)$/i.exec(line);
    if (nameMatch?.[1]) {
      name = nameMatch[1].trim();
      continue;
    }
    if (line === '' || line.startsWith('#') || /^Columns:/i.test(line)) continue;
    const match = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\b/.exec(line);
    if (!match) throw new Error(`Invalid palette line: "${line}".`);
    const [r, g, b] = [match[1], match[2], match[3]].map(Number) as [number, number, number];
    if ([r, g, b].some((v) => v > 255)) throw new Error(`Color out of range: "${line}".`);
    colors.push({ r, g, b, hex: toHex(r, g, b) });
  }
  return createPalette(name, colors);
}
