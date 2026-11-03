// Shape tests used by collision (decision 0010): circles against axis-aligned boxes, and
// segments against boxes.
import type { Box } from '../map/map-data';

/** Distances closer than this count as touching, absorbing floating-point noise. */
export const EPSILON = 1e-6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Whether a circle overlaps a box by more than EPSILON. */
export function circleOverlapsBox(x: number, y: number, radius: number, box: Box): boolean {
  const dx = x - clamp(x, box.x, box.x + box.width);
  const dy = y - clamp(y, box.y, box.y + box.height);
  const reach = radius - EPSILON;
  return dx * dx + dy * dy < reach * reach;
}

/**
 * The smallest displacement that takes a circle out of a box, or undefined when they do not
 * overlap. A center inside the box leaves through the nearest side.
 */
export function pushCircleOutOfBox(
  x: number,
  y: number,
  radius: number,
  box: Box,
): { x: number; y: number } | undefined {
  const dx = x - clamp(x, box.x, box.x + box.width);
  const dy = y - clamp(y, box.y, box.y + box.height);
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared >= radius * radius) return undefined;
  if (distanceSquared > 0) {
    const distance = Math.sqrt(distanceSquared);
    const depth = radius - distance;
    return { x: (dx / distance) * depth, y: (dy / distance) * depth };
  }
  const exits = [
    { x: box.x - radius - x, y: 0 },
    { x: box.x + box.width + radius - x, y: 0 },
    { x: 0, y: box.y - radius - y },
    { x: 0, y: box.y + box.height + radius - y },
  ];
  let best = exits[0] as { x: number; y: number };
  for (const exit of exits)
    if (Math.abs(exit.x) + Math.abs(exit.y) < Math.abs(best.x) + Math.abs(best.y)) best = exit;
  return best;
}

/**
 * Where the segment from (ax, ay) to (bx, by) enters a box, as a fraction t in [0, 1] of its
 * length; 0 when it starts inside; undefined when it misses.
 */
export function segmentEntersBox(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  box: Box,
): number | undefined {
  let enter = 0;
  let exit = 1;
  const axes = [
    [ax, bx - ax, box.x, box.x + box.width],
    [ay, by - ay, box.y, box.y + box.height],
  ] as const;
  for (const [start, delta, min, max] of axes) {
    if (delta === 0) {
      if (start < min || start > max) return undefined;
      continue;
    }
    let t0 = (min - start) / delta;
    let t1 = (max - start) / delta;
    if (t0 > t1) [t0, t1] = [t1, t0];
    enter = Math.max(enter, t0);
    exit = Math.min(exit, t1);
    if (enter > exit) return undefined;
  }
  return enter;
}

/**
 * Where the segment from (ax, ay) to (bx, by) enters a circle, as a fraction t in [0, 1] of
 * its length; 0 when it starts inside; undefined when it misses.
 */
export function segmentEntersCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number,
): number | undefined {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - cx;
  const fy = ay - cy;
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return undefined;
  const b = 2 * (fx * dx + fy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return undefined;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : undefined;
}
