// Bot navigation (decision 0011): A* on the tile grid, then the path is smoothed into a few
// straight runs a character can actually walk.
import type { Box, CollisionGrid } from '@pixel-shoot/sim';
import { BLOCKS_MOVEMENT, TILE_SIZE, circleBlocked, tileOf } from '@pixel-shoot/sim';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Which tiles a character may walk through: no blocking flag, no blocking footprint. */
export class NavGrid {
  readonly width: number;
  readonly height: number;
  readonly #walkable: Uint8Array;
  readonly #grid: CollisionGrid;

  constructor(grid: CollisionGrid) {
    this.#grid = grid;
    this.width = grid.width;
    this.height = grid.height;
    this.#walkable = new Uint8Array(grid.width * grid.height);
    this.rebuild();
  }

  /** Reads every tile again: the map changed as a whole (a new round). */
  rebuild(): void {
    this.refreshArea({
      x: 0,
      y: 0,
      width: this.width * TILE_SIZE,
      height: this.height * TILE_SIZE,
    });
  }

  /** Reads again the tiles a box touches: a map element was destroyed there. */
  refreshArea(box: Box): void {
    const grid = this.#grid;
    const right = Math.min(this.width - 1, tileOf(box.x + box.width - 1e-9));
    const bottom = Math.min(this.height - 1, tileOf(box.y + box.height - 1e-9));
    for (let y = Math.max(0, tileOf(box.y)); y <= bottom; y++)
      for (let x = Math.max(0, tileOf(box.x)); x <= right; x++) {
        const blocked =
          (grid.flagsAt(x, y) & BLOCKS_MOVEMENT) !== 0 ||
          grid.footprintsAt(x, y).some((f) => (f.flags & BLOCKS_MOVEMENT) !== 0);
        this.#walkable[y * this.width + x] = blocked ? 0 : 1;
      }
  }

  walkable(x: number, y: number): boolean {
    return (
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height &&
      this.#walkable[y * this.width + x] === 1
    );
  }

  /** Whether a circle can walk straight from a to b (checked every few pixels). */
  clearPath(a: Point, b: Point, radius: number): boolean {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / 6));
    for (let i = 1; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps;
      const y = a.y + ((b.y - a.y) * i) / steps;
      if (circleBlocked(this.#grid, x, y, radius + 1, BLOCKS_MOVEMENT)) return false;
    }
    return true;
  }
}

const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/** A binary min-heap of node indices keyed by score. */
class Heap {
  readonly #items: number[] = [];
  readonly #score: Float64Array;
  constructor(score: Float64Array) {
    this.#score = score;
  }
  get size() {
    return this.#items.length;
  }
  push(item: number) {
    const items = this.#items;
    items.push(item);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.#score[items[parent]!]! <= this.#score[item]!) break;
      items[i] = items[parent]!;
      i = parent;
    }
    items[i] = item;
  }
  pop(): number {
    const items = this.#items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        const score = (k: number) => (k === i ? this.#score[last]! : this.#score[items[k]!]!);
        if (left < items.length && score(left) < score(smallest)) smallest = left;
        if (right < items.length && score(right) < score(smallest)) smallest = right;
        if (smallest === i) break;
        items[i] = items[smallest]!;
        i = smallest;
      }
      items[i] = last;
    }
    return top;
  }
}

/**
 * Tile centers from `from` to `to` (world pixels), or undefined when `to` cannot be reached.
 * Diagonal steps never cut a blocked corner. `maxNodes` bounds the work.
 */
export function findPath(
  nav: NavGrid,
  from: Point,
  to: Point,
  maxNodes = 20_000,
): Point[] | undefined {
  const sx = tileOf(from.x);
  const sy = tileOf(from.y);
  const gx = tileOf(to.x);
  const gy = tileOf(to.y);
  if (!nav.walkable(gx, gy)) return undefined;
  const width = nav.width;
  const count = width * nav.height;
  const start = sy * width + sx;
  const goal = gy * width + gx;
  const cost = new Float64Array(count).fill(Infinity);
  const score = new Float64Array(count).fill(Infinity);
  const cameFrom = new Int32Array(count).fill(-1);
  const closed = new Uint8Array(count);
  const heuristic = (x: number, y: number) => {
    const dx = Math.abs(x - gx);
    const dy = Math.abs(y - gy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const open = new Heap(score);
  cost[start] = 0;
  score[start] = heuristic(sx, sy);
  open.push(start);
  let expanded = 0;
  while (open.size > 0 && expanded < maxNodes) {
    const node = open.pop();
    if (closed[node]) continue;
    closed[node] = 1;
    expanded++;
    if (node === goal) {
      const tiles: Point[] = [];
      for (let n = goal; n !== -1; n = cameFrom[n]!)
        tiles.push({
          x: (n % width) * TILE_SIZE + TILE_SIZE / 2,
          y: Math.floor(n / width) * TILE_SIZE + TILE_SIZE / 2,
        });
      return tiles.reverse();
    }
    const x = node % width;
    const y = Math.floor(node / width);
    for (const [dx, dy, step] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!nav.walkable(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!nav.walkable(x + dx, y) || !nav.walkable(x, y + dy))) continue;
      const next = ny * width + nx;
      const tentative = cost[node]! + step;
      if (tentative >= cost[next]!) continue;
      cost[next] = tentative;
      cameFrom[next] = node;
      score[next] = tentative + heuristic(nx, ny);
      open.push(next);
    }
  }
  return undefined;
}

/**
 * Keeps only the waypoints needed to walk the path in straight runs: from each point, jump to
 * the farthest later point reachable in a straight line. Ends exactly at `to`.
 */
export function smoothPath(
  nav: NavGrid,
  from: Point,
  tiles: readonly Point[],
  to: Point,
  radius: number,
): Point[] {
  const points = [from, ...tiles.slice(1, -1), to];
  const result: Point[] = [];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !nav.clearPath(points[i]!, points[j]!, radius)) j--;
    result.push(points[j]!);
    i = j;
  }
  return result;
}
