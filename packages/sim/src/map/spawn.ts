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
