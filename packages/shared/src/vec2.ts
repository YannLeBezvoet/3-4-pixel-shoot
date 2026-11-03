// 2D vectors in world/screen coordinates: x grows to the right, y grows downward.

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const ZERO: Vec2 = { x: 0, y: 0 };

export function of(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, factor: number): Vec2 {
  return { x: v.x * factor, y: v.y * factor };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Unit vector with the same direction; the zero vector stays zero. */
export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len === 0 ? ZERO : { x: v.x / len, y: v.y / len };
}

/** Angle in radians: 0 points right (east), π/2 points down (south). */
export function angleOf(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function fromAngle(angle: number, len = 1): Vec2 {
  return { x: Math.cos(angle) * len, y: Math.sin(angle) * len };
}
