import { describe, expect, it } from 'vitest';
import * as vec2 from './vec2';

describe('vec2', () => {
  it('adds, subtracts and scales', () => {
    expect(vec2.add(vec2.of(1, 2), vec2.of(3, -4))).toEqual({ x: 4, y: -2 });
    expect(vec2.sub(vec2.of(1, 2), vec2.of(3, -4))).toEqual({ x: -2, y: 6 });
    expect(vec2.scale(vec2.of(1, -2), 3)).toEqual({ x: 3, y: -6 });
    expect(vec2.dot(vec2.of(1, 2), vec2.of(3, 4))).toBe(11);
  });

  it('measures lengths and distances', () => {
    expect(vec2.length(vec2.of(3, 4))).toBe(5);
    expect(vec2.distance(vec2.of(1, 1), vec2.of(4, 5))).toBe(5);
  });

  it('normalizes, keeping the zero vector at zero', () => {
    expect(vec2.normalize(vec2.of(0, -5))).toEqual({ x: 0, y: -1 });
    expect(vec2.normalize(vec2.ZERO)).toEqual({ x: 0, y: 0 });
  });

  it('uses the screen convention for angles (y down)', () => {
    expect(vec2.angleOf(vec2.of(1, 0))).toBe(0);
    expect(vec2.angleOf(vec2.of(0, 1))).toBeCloseTo(Math.PI / 2);
    const v = vec2.fromAngle(Math.PI / 2, 2);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(2);
  });
});
