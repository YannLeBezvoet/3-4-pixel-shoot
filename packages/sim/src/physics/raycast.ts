// Segment casts through the static world: grid traversal (Amanatides & Woo) plus footprint
// tests in each tile crossed. Used by projectiles and line of sight (decision 0010).
import type { CollisionGrid } from '../map/collision-grid';
import { tileOf } from '../map/collision-grid';
import type { Footprint } from '../map/map-data';
import { BLOCKS_SIGHT, TILE_SIZE } from '../map/map-data';
import { segmentEntersBox } from './geometry';

export interface SegmentHit {
  /** Fraction of the segment travelled before the hit, in [0, 1]. */
  readonly t: number;
  readonly x: number;
  readonly y: number;
  /** Unit normal of the side met, along one axis. */
  readonly normalX: number;
  readonly normalY: number;
  /** The tile that stopped the segment, or the one where it met `footprint`. */
  readonly tileX: number;
  readonly tileY: number;
  /** The footprint that stopped the segment; undefined when a tile did. */
  readonly footprint: Footprint | undefined;
}

/** Normal of the side of a box nearest to a point on it. */
function boxNormal(x: number, y: number, box: Footprint): { x: number; y: number } {
  const sides = [
    { distance: Math.abs(x - box.x), x: -1, y: 0 },
    { distance: Math.abs(x - (box.x + box.width)), x: 1, y: 0 },
    { distance: Math.abs(y - box.y), x: 0, y: -1 },
    { distance: Math.abs(y - (box.y + box.height)), x: 0, y: 1 },
  ];
  return sides.reduce((best, side) => (side.distance < best.distance ? side : best));
}

/**
 * The first point where the segment from (ax, ay) to (bx, by) meets a tile or footprint with
 * any of `mask` flags, or undefined when the way is clear. When `passes` is given, it is asked
 * about each footprint met, once and in path order, up to the first stop; returning true lets
 * the segment through that footprint. Tiles always stop it.
 */
export function castSegment(
  grid: CollisionGrid,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  mask: number,
  passes?: (footprint: Footprint, t: number) => boolean,
): SegmentHit | undefined {
  const dx = bx - ax;
  const dy = by - ay;
  let tx = tileOf(ax);
  let ty = tileOf(ay);
  const endX = tileOf(bx);
  const endY = tileOf(by);
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  // Fraction of the segment at which it crosses the next vertical / horizontal tile edge.
  const edgeT = (start: number, delta: number, tile: number, step: number) =>
    step === 0 ? Infinity : ((step > 0 ? tile + 1 : tile) * TILE_SIZE - start) / delta;
  let nextX = edgeT(ax, dx, tx, stepX);
  let nextY = edgeT(ay, dy, ty, stepY);
  const deltaX = stepX === 0 ? Infinity : TILE_SIZE / Math.abs(dx);
  const deltaY = stepY === 0 ? Infinity : TILE_SIZE / Math.abs(dy);

  let best = Infinity;
  let enter = 0;
  /** What stopped the segment so far. */
  let stopFootprint: Footprint | undefined;
  let stopTileX = tx;
  let stopTileY = ty;
  /** Which way the traversal last stepped: the side of the next tile it enters. */
  let enteredX = Math.abs(dx) >= Math.abs(dy);
  /** Footprints met, when `passes` decides about them; one footprint may touch several tiles. */
  const met: { footprint: Footprint; t: number; tileX: number; tileY: number }[] = [];
  for (;;) {
    if (enter > best) break;
    if (grid.flagsAt(tx, ty) & mask) {
      if (enter < best) {
        best = enter;
        stopFootprint = undefined;
        stopTileX = tx;
        stopTileY = ty;
      }
      break;
    }
    for (const footprint of grid.footprintsAt(tx, ty)) {
      if (!(footprint.flags & mask)) continue;
      const t = segmentEntersBox(ax, ay, bx, by, footprint);
      if (t === undefined || t >= best) continue;
      if (!passes) {
        best = t;
        stopFootprint = footprint;
        stopTileX = tx;
        stopTileY = ty;
      } else if (!met.some((m) => m.footprint === footprint))
        met.push({ footprint, t, tileX: tx, tileY: ty });
    }
    if (tx === endX && ty === endY) break;
    if (nextX < nextY) {
      enter = nextX;
      nextX += deltaX;
      tx += stepX;
      enteredX = true;
    } else {
      enter = nextY;
      nextY += deltaY;
      ty += stepY;
      enteredX = false;
    }
    if (enter > 1) break;
  }
  // Sorting is stable: footprints met at the same point keep the order they were found in.
  met.sort((a, b) => a.t - b.t);
  for (const { footprint, t, tileX, tileY } of met) {
    if (t >= best) break;
    if (!passes!(footprint, t)) {
      best = t;
      stopFootprint = footprint;
      stopTileX = tileX;
      stopTileY = tileY;
      break;
    }
  }
  if (best > 1) return undefined;
  const x = ax + dx * best;
  const y = ay + dy * best;
  const normal = stopFootprint
    ? boxNormal(x, y, stopFootprint)
    : enteredX
      ? { x: -stepX, y: 0 }
      : { x: 0, y: -stepY };
  return {
    t: best,
    x,
    y,
    normalX: normal.x,
    normalY: normal.y,
    tileX: stopTileX,
    tileY: stopTileY,
    footprint: stopFootprint,
  };
}

/** Whether nothing that blocks sight stands between two points. */
export function lineOfSight(
  grid: CollisionGrid,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return castSegment(grid, ax, ay, bx, by, BLOCKS_SIGHT) === undefined;
}
