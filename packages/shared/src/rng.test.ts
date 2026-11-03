import { describe, expect, it } from 'vitest';
import { createRng, hashString } from './rng';

const draw = (seed: number | string, count: number) => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.nextUint32());
};

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    expect(draw(42, 20)).toEqual(draw(42, 20));
    expect(draw('village', 20)).toEqual(draw('village', 20));
  });

  it('gives different streams for different seeds', () => {
    expect(draw(1, 5)).not.toEqual(draw(2, 5));
  });

  it('keeps values within the requested ranges', () => {
    const rng = createRng(7);
    for (let i = 0; i < 2000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(-3, 3);
      expect(Number.isInteger(n) && n >= -3 && n <= 3).toBe(true);
    }
  });

  it('covers every integer of a small range', () => {
    const rng = createRng(3);
    const seen = new Set(Array.from({ length: 500 }, () => rng.int(1, 6)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('forks independent, reproducible streams without consuming the parent', () => {
    const a = createRng(9);
    const b = createRng(9);
    const forkA = a.fork('bots');
    expect(a.nextUint32()).toBe(b.nextUint32());
    expect(forkA.nextUint32()).toBe(createRng(9).fork('bots').nextUint32());
    expect(createRng(9).fork('bots').nextUint32()).not.toBe(createRng(9).fork('fx').nextUint32());
  });

  it('refuses to pick from an empty array', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});

describe('hashString', () => {
  it('matches the reference FNV-1a values', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('foobar')).toBe(0xbf9cf968);
  });
});
