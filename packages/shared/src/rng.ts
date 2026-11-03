// Seeded pseudo-random numbers. The simulation never uses Math.random: every random
// draw goes through an Rng so that the same seed and inputs give the same results.

export interface Rng {
  /** The seed this generator was created from. */
  readonly seed: number;
  /** Next integer in [0, 2^32). */
  nextUint32(): number;
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both included. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /**
   * An independent generator derived from this generator's seed and a label.
   * It does not consume numbers from this generator, so adding a fork does not change
   * other streams; forking twice with the same label gives the same stream.
   */
  fork(label: string): Rng;
}

/** 32-bit FNV-1a hash, used to turn strings into seeds. */
export function hashString(text: string, basis = 0x811c9dc5): number {
  let hash = basis >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function splitmix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/** Creates a generator (sfc32 algorithm) from a numeric or text seed. */
export function createRng(seed: number | string): Rng {
  const numericSeed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  const init = splitmix32(numericSeed);
  let a = init();
  let b = init();
  let c = init();
  let d = init();

  const nextUint32 = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t;
  };
  const next = (): number => nextUint32() / 0x1_0000_0000;

  return {
    seed: numericSeed,
    nextUint32,
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError('Rng.pick needs a non-empty array.');
      return items[Math.floor(next() * items.length)] as T;
    },
    fork: (label) => createRng(hashString(label, numericSeed ^ 0x811c9dc5)),
  };
}
