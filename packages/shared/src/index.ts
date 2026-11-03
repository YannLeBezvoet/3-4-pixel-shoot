// Public entry point. Only what is exported here may be imported by other packages.
export type { Vec2 } from './vec2';
export * as vec2 from './vec2';
export { TAU, OCTANTS, degToRad, normalizeAngle, octantAngle, octantOf } from './angle';
export type { Octant } from './angle';
export { createRng, hashString } from './rng';
export type { Rng } from './rng';
export { err, ok } from './result';
export type { Result } from './result';
