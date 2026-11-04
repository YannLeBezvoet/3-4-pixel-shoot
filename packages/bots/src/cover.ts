// Taking cover (Q29, Q68): cover does not hide a bot, it stops bullets. A safe spot is one the
// attacker's bullets cannot reach in a straight line, because a solid obstacle or cover stands
// between them.
import type { CollisionGrid } from '@pixel-shoot/sim';
import { BLOCKS_PROJECTILES, TILE_SIZE, TileFlag, castSegment, tileOf } from '@pixel-shoot/sim';
import type { NavGrid, Point } from './navigation';

const STOPS_BULLETS = BLOCKS_PROJECTILES | TileFlag.cover;

/** Tiles walked at most to reach cover: what a character covers in about 2.5 seconds. */
export const COVER_SEARCH_TILES = 9;

/** Whether something between `from` and `to` stops a bullet. */
export function shielded(grid: CollisionGrid, from: Point, to: Point): boolean {
  return castSegment(grid, from.x, from.y, to.x, to.y, STOPS_BULLETS) !== undefined;
}

/**
 * The nearest tile center, in walking distance, where a character is shielded from `attacker`:
 * tiles are visited ring by ring, so walls count and the first safe one is the closest.
 */
export function findCover(
  nav: NavGrid,
  grid: CollisionGrid,
  from: Point,
  attacker: Point,
): Point | undefined {
  const start = { x: tileOf(from.x), y: tileOf(from.y), steps: 0 };
  const seen = new Set([start.y * nav.width + start.x]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const tile = queue[head]!;
    const center = { x: (tile.x + 0.5) * TILE_SIZE, y: (tile.y + 0.5) * TILE_SIZE };
    if (tile.steps > 0 && shielded(grid, attacker, center)) return center;
    if (tile.steps >= COVER_SEARCH_TILES) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = tile.x + dx;
      const y = tile.y + dy;
      const key = y * nav.width + x;
      if (seen.has(key) || !nav.walkable(x, y)) continue;
      seen.add(key);
      queue.push({ x, y, steps: tile.steps + 1 });
    }
  }
  return undefined;
}
