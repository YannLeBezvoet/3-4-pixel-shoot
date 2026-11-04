import { asciiMap, buildCollisionGrid } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { NavGrid, findPath, smoothPath } from './navigation';

const nav = (rows: string) => new NavGrid(buildCollisionGrid(asciiMap(rows)));
const tile = (x: number, y: number) => ({ x: x * 48 + 24, y: y * 48 + 24 });

describe('navigation', () => {
  const walls = nav(`
    ##########
    #........#
    #.######.#
    #......#.#
    ######.#.#
    #......#.#
    #~~~~~~#.#
    #o.......#
    ##########
  `);

  it('finds a path around walls', () => {
    const path = findPath(walls, tile(1, 1), tile(1, 5))!;
    expect(path[0]).toEqual(tile(1, 1));
    expect(path.at(-1)).toEqual(tile(1, 5));
    for (const p of path)
      expect(walls.walkable(Math.floor(p.x / 48), Math.floor(p.y / 48))).toBe(true);
  });

  it('goes around deep water and object footprints', () => {
    const path = findPath(walls, tile(1, 5), tile(2, 7))!;
    expect(path).toBeDefined();
    // The only way down is the corridor on the right: water blocks row 6.
    expect(path.some((p) => p.x === tile(8, 0).x)).toBe(true);
    expect(walls.walkable(1, 7)).toBe(false);
  });

  it('never cuts a blocked corner diagonally', () => {
    const corner = nav(`
      ....
      .#..
      ....
    `);
    const path = findPath(corner, tile(0, 0), tile(2, 2))!;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const through = [
        { x: Math.floor(b.x / 48), y: Math.floor(a.y / 48) },
        { x: Math.floor(a.x / 48), y: Math.floor(b.y / 48) },
      ];
      for (const t of through) expect(corner.walkable(t.x, t.y)).toBe(true);
    }
  });

  it('gives up on unreachable or blocked goals', () => {
    const closed = nav(`
      ..#..
      ..#..
    `);
    expect(findPath(closed, tile(0, 0), tile(4, 0))).toBeUndefined();
    expect(findPath(closed, tile(0, 0), tile(2, 0))).toBeUndefined();
  });

  it('follows the map elements destroyed, then the map coming back', () => {
    const grid = buildCollisionGrid(asciiMap('...w...'));
    const changing = new NavGrid(grid);
    expect(findPath(changing, tile(0, 0), tile(6, 0))).toBeUndefined();
    grid.setFlags(3, 0, 0);
    changing.refreshArea({ x: 144, y: 0, width: 48, height: 48 });
    expect(findPath(changing, tile(0, 0), tile(6, 0))).toBeDefined();
    grid.reset();
    changing.rebuild();
    expect(findPath(changing, tile(0, 0), tile(6, 0))).toBeUndefined();
  });

  it('smooths a path into straight runs that are clear to walk', () => {
    const open = nav(`
      ..........
      ..........
      ....##....
      ..........
    `);
    const from = { x: 30, y: 30 };
    const to = { x: 450, y: 170 };
    const tiles = findPath(open, from, to)!;
    const smooth = smoothPath(open, from, tiles, to, 10);
    expect(smooth.length).toBeLessThan(tiles.length);
    expect(smooth.at(-1)).toEqual(to);
    let previous = from;
    for (const point of smooth) {
      expect(open.clearPath(previous, point, 10)).toBe(true);
      previous = point;
    }
  });
});
