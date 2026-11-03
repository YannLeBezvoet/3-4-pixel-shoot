import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGpl, toHex } from './palette';

const resurrect64 = readFileSync(
  new URL('../../../../palette/resurrect-64.gpl', import.meta.url),
  'utf8',
);

describe('parseGpl', () => {
  it('reads the Resurrect 64 palette shipped in the repository', () => {
    const palette = parseGpl(resurrect64);
    expect(palette.name).toBe('Resurrect 64');
    expect(palette.colors).toHaveLength(64);
    expect(palette.colors[0]).toEqual({ r: 46, g: 34, b: 47, hex: '2e222f' });
    expect(palette.has(255, 255, 255)).toBe(true);
    expect(palette.has(255, 0, 0)).toBe(false);
  });

  it('finds the nearest palette color', () => {
    const palette = parseGpl(resurrect64);
    expect(palette.nearest(46, 34, 47).hex).toBe('2e222f');
    expect(palette.nearest(250, 250, 250).hex).toBe('ffffff');
    expect(palette.nearest(0, 0, 0).hex).toBe('2e222f');
  });

  it('rejects files that are not GIMP palettes or have broken lines', () => {
    expect(() => parseGpl('JASC-PAL\n')).toThrow('Not a GIMP palette');
    expect(() => parseGpl('GIMP Palette\n10 20\n')).toThrow('Invalid palette line');
    expect(() => parseGpl('GIMP Palette\n300 0 0\n')).toThrow('out of range');
  });
});

describe('toHex', () => {
  it('pads to six digits', () => {
    expect(toHex(0, 1, 255)).toBe('0001ff');
  });
});
