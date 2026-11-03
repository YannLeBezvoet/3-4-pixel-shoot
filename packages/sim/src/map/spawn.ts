// Where characters may appear: free tiles inside a team's spawn areas (Q52).
import type { CollisionGrid } from './collision-grid';
import { tileOf } from './collision-grid';
import type { MapData } from './map-data';
import { BLOCKS_MOVEMENT, TILE_SIZE } from './map-data';
import { circleBlocked } from '../physics/move-circle';

/** Centers of the tiles of a team's spawn areas where a character of `radius` fits. */
export function spawnSpots(
  map: MapData,
  grid: CollisionGrid,
  team: number,
  radius: number,
): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  const seen = new Set<number>();
  for (const area of map.spawns) {
    if (area.team !== team) continue;
    for (let ty = tileOf(area.y); ty <= tileOf(area.y + area.height - 1e-9); ty++)
      for (let tx = tileOf(area.x); tx <= tileOf(area.x + area.width - 1e-9); tx++) {
        const key = ty * map.width + tx;
        const x = tx * TILE_SIZE + TILE_SIZE / 2;
        const y = ty * TILE_SIZE + TILE_SIZE / 2;
        if (seen.has(key) || circleBlocked(grid, x, y, radius, BLOCKS_MOVEMENT)) continue;
        seen.add(key);
        spots.push({ x, y });
      }
  }
  return spots;
}

/**
 * The free spot nearest to a point for a circle of `radius`: the point itself when it is
 * free, otherwise the closest tile center that is, searched up to `maxTiles` tiles away.
 */
export function nearestFreeSpot(
  grid: CollisionGrid,
  x: number,
  y: number,
  radius: number,
  maxTiles = 8,
): { x: number; y: number } | undefined {
  if (!circleBlocked(grid, x, y, radius, BLOCKS_MOVEMENT)) return { x, y };
  const tx = tileOf(x);
  const ty = tileOf(y);
  let best: { x: number; y: number; distance: number } | undefined;
  for (let ring = 1; ring <= maxTiles && !best; ring++)
    for (let dy = -ring; dy <= ring; dy++)
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const cx = (tx + dx) * TILE_SIZE + TILE_SIZE / 2;
        const cy = (ty + dy) * TILE_SIZE + TILE_SIZE / 2;
        if (circleBlocked(grid, cx, cy, radius, BLOCKS_MOVEMENT)) continue;
        const distance = Math.hypot(cx - x, cy - y);
        if (!best || distance < best.distance) best = { x: cx, y: cy, distance };
      }
  return best && { x: best.x, y: best.y };
}
