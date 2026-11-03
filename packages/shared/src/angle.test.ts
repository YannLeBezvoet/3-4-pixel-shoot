import { describe, expect, it } from 'vitest';
import { OCTANTS, degToRad, normalizeAngle, octantAngle, octantOf } from './angle';

describe('normalizeAngle', () => {
  it('maps any angle into (-π, π]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(degToRad(-450))).toBeCloseTo(degToRad(-90));
  });
});

describe('octantOf', () => {
  it('maps each axis to its direction (screen y points down)', () => {
    const expected = {
      0: 'e',
      45: 'se',
      90: 's',
      135: 'sw',
      180: 'w',
      225: 'nw',
      270: 'n',
      315: 'ne',
    };
    for (const [deg, octant] of Object.entries(expected)) {
      expect(octantOf(degToRad(Number(deg))), `${deg}°`).toBe(octant);
      expect(octantOf(degToRad(Number(deg) - 360)), `${Number(deg) - 360}°`).toBe(octant);
    }
  });

  it('gives each direction a 45° sector, boundaries going clockwise', () => {
    expect(octantOf(degToRad(22.4))).toBe('e');
    expect(octantOf(degToRad(22.5))).toBe('se');
    expect(octantOf(degToRad(-22.4))).toBe('e');
    expect(octantOf(degToRad(-22.6))).toBe('ne');
    expect(octantOf(degToRad(179.9))).toBe('w');
    expect(octantOf(degToRad(-179.9))).toBe('w');
  });

  it('round-trips with octantAngle', () => {
    for (const octant of OCTANTS) expect(octantOf(octantAngle(octant))).toBe(octant);
  });
});
