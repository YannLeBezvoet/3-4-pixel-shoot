// Moving a circle through the static world with sliding (decision 0010). A circle that
// starts clear of obstacles never ends inside one: each sub-move is resolved by pushing out
// of what it touches, and a sub-move that cannot be resolved is cancelled.
import type { CollisionGrid } from '../map/collision-grid';
import { tileOf } from '../map/collision-grid';
import type { Box } from '../map/map-data';
import { TILE_SIZE } from '../map/map-data';
import { circleOverlapsBox, pushCircleOutOfBox } from './geometry';

const RESOLVE_ITERATIONS = 4;

/** The obstacles with any of `mask` flags near a circle: blocking tiles and footprints. */
function obstaclesNear(
  grid: CollisionGrid,
  x: number,
  y: number,
  radius: number,
  mask: number,
): Box[] {
  const boxes: Box[] = [];
  const seen = new Set<Box>();
  const x0 = tileOf(x - radius);
  const x1 = tileOf(x + radius);
  const y0 = tileOf(y - radius);
  const y1 = tileOf(y + radius);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (grid.flagsAt(tx, ty) & mask)
        boxes.push({ x: tx * TILE_SIZE, y: ty * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      for (const footprint of grid.footprintsAt(tx, ty)) {
        if (!(footprint.flags & mask) || seen.has(footprint)) continue;
        seen.add(footprint);
        boxes.push(footprint);
      }
    }
  }
  return boxes;
}

/** Whether a circle overlaps any obstacle with `mask` flags. */
export function circleBlocked(
  grid: CollisionGrid,
  x: number,
  y: number,
  radius: number,
  mask: number,
): boolean {
  return obstaclesNear(grid, x, y, radius, mask).some((box) =>
    circleOverlapsBox(x, y, radius, box),
  );
}

/** Tries to place a circle at (x, y), pushed out of obstacles; undefined when it cannot fit. */
function resolve(
  grid: CollisionGrid,
  x: number,
  y: number,
  radius: number,
  mask: number,
): { x: number; y: number } | undefined {
  for (let i = 0; i < RESOLVE_ITERATIONS; i++) {
    let pushed = false;
    for (const box of obstaclesNear(grid, x, y, radius, mask)) {
      const push = pushCircleOutOfBox(x, y, radius, box);
      if (!push) continue;
      x += push.x;
      y += push.y;
      pushed = true;
    }
    if (!pushed) break;
  }
  return circleBlocked(grid, x, y, radius, mask) ? undefined : { x, y };
}

/**
 * Moves a circle by (dx, dy), sliding along obstacles with any of `mask` flags, in sub-moves
 * no longer than half the radius so that nothing is crossed. Returns the new center.
 */
export function moveCircle(
  grid: CollisionGrid,
  x: number,
  y: number,
  radius: number,
  dx: number,
  dy: number,
  mask: number,
): { x: number; y: number } {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (radius / 2)));
  let position = { x, y };
  for (let i = 0; i < steps; i++) {
    const next = resolve(grid, position.x + dx / steps, position.y + dy / steps, radius, mask);
    if (next) position = next;
  }
  return position;
}
