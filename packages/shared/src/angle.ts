// Angles in radians, screen convention: 0 = east (right), π/2 = south (down).

export const TAU = Math.PI * 2;

/** Brings an angle into the range (-π, π]. */
export function normalizeAngle(angle: number): number {
  let a = angle % TAU;
  if (a <= -Math.PI) a += TAU;
  else if (a > Math.PI) a -= TAU;
  return a;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** The 8 on-screen directions, clockwise from east (y grows downward). */
export const OCTANTS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export type Octant = (typeof OCTANTS)[number];

const SECTOR = Math.PI / 4;

/**
 * The direction an angle falls into. Each direction covers ±22.5° around its axis;
 * an angle exactly on a boundary belongs to the next direction clockwise.
 */
export function octantOf(angle: number): Octant {
  const index = Math.floor(normalizeAngle(angle) / SECTOR + 0.5);
  return OCTANTS[((index % 8) + 8) % 8] as Octant;
}

/** The axis angle of a direction, in (-π, π]. */
export function octantAngle(octant: Octant): number {
  return normalizeAngle(OCTANTS.indexOf(octant) * SECTOR);
}
