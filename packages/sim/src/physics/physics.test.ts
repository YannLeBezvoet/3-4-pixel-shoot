import { describe, expect, it } from 'vitest';
import { buildCollisionGrid } from '../map/collision-grid';
import type { Footprint } from '../map/map-data';
import { BLOCKS_MOVEMENT, BLOCKS_PROJECTILES, TILE_SIZE, TileFlag } from '../map/map-data';
import { asciiMap } from '../testing/ascii-map';
import { circleOverlapsBox, pushCircleOutOfBox, segmentEntersBox } from './geometry';
import { circleBlocked, moveCircle } from './move-circle';
import { castSegment, lineOfSight } from './raycast';
import { SpatialHash } from './spatial-hash';

const box = { x: 0, y: 0, width: 48, height: 48 };

describe('circle and box', () => {
  it('detects overlap, ignoring mere contact', () => {
    expect(circleOverlapsBox(58, 24, 10, box)).toBe(false);
    expect(circleOverlapsBox(57, 24, 10, box)).toBe(true);
    expect(circleOverlapsBox(55, 55, 10, box)).toBe(true);
    expect(circleOverlapsBox(56, 56, 10, box)).toBe(false);
  });

  it('pushes a circle out along the shortest way', () => {
    expect(pushCircleOutOfBox(55, 24, 10, box)).toEqual({ x: 3, y: 0 });
    expect(pushCircleOutOfBox(70, 24, 10, box)).toBeUndefined();
    const corner = pushCircleOutOfBox(52, 52, 10, box);
    expect(Math.hypot(4 + corner!.x, 4 + corner!.y)).toBeCloseTo(10, 9);
    // Center inside: out through the nearest side.
    expect(pushCircleOutOfBox(5, 30, 10, box)).toEqual({ x: -15, y: 0 });
    expect(pushCircleOutOfBox(30, 44, 10, box)).toEqual({ x: 0, y: 14 });
  });
});

describe('segmentEntersBox', () => {
  it('finds where a segment enters a box', () => {
    expect(segmentEntersBox(-48, 24, 48, 24, box)).toBe(0.5);
    expect(segmentEntersBox(24, -96, 24, 96, box)).toBe(0.5);
    expect(segmentEntersBox(10, 10, 100, 100, box)).toBe(0);
    expect(segmentEntersBox(-10, 60, 100, 60, box)).toBeUndefined();
    expect(segmentEntersBox(-100, -100, -10, -10, box)).toBeUndefined();
    expect(segmentEntersBox(60, 0, 60, 48, box)).toBeUndefined();
  });
});

describe('moveCircle', () => {
  const grid = buildCollisionGrid(
    asciiMap(`
      #######
      #.....#
      #..#..#
      #.~~o.#
      #######
    `),
  );

  it('moves freely in open space', () => {
    expect(moveCircle(grid, 72, 72, 10, 20, 5, BLOCKS_MOVEMENT)).toEqual({ x: 92, y: 77 });
  });

  it('stops against a wall and slides along it', () => {
    // Moving up-left into the top wall from (72, 60): y stops at 48 + 10, x keeps going.
    const end = moveCircle(grid, 100, 60, 10, -20, -20, BLOCKS_MOVEMENT);
    expect(end.y).toBeCloseTo(58, 9);
    expect(end.x).toBeCloseTo(80, 9);
  });

  it('never crosses a wall, even with a long move', () => {
    const end = moveCircle(grid, 72, 72, 10, 400, 0, BLOCKS_MOVEMENT);
    expect(end.x).toBeCloseTo(6 * TILE_SIZE - 10, 9);
    expect(circleBlocked(grid, end.x, end.y, 10, BLOCKS_MOVEMENT)).toBe(false);
  });

  it('is blocked by impassable tiles and object footprints, but only for their mask', () => {
    const intoWater = moveCircle(grid, 120, 130, 10, 0, 40, BLOCKS_MOVEMENT);
    expect(intoWater.y).toBeCloseTo(3 * TILE_SIZE - 10, 9);
    expect(moveCircle(grid, 120, 130, 10, 0, 40, BLOCKS_PROJECTILES).y).toBe(170);
    // The footprint of the object at tile (4, 3) spans x 208..224, y 160..176.
    const intoObject = moveCircle(grid, 216, 130, 10, 0, 40, BLOCKS_MOVEMENT);
    expect(intoObject.y).toBeCloseTo(150, 9);
  });

  it('cancels a move that cannot be resolved, keeping the start position', () => {
    const narrow = buildCollisionGrid(asciiMap('#.#'));
    // A circle wider than the 48 px gap cannot be placed anywhere.
    expect(moveCircle(narrow, 72, 24, 30, 2, 0, BLOCKS_MOVEMENT)).toEqual({ x: 72, y: 24 });
  });
});

describe('castSegment', () => {
  const grid = buildCollisionGrid(
    asciiMap(`
      ......
      ..#...
      ....o.
      ~.....
    `),
  );

  it('stops at the first solid tile', () => {
    const hit = castSegment(grid, 24, 72, 260, 72, BLOCKS_PROJECTILES);
    expect(hit?.x).toBeCloseTo(96, 9);
    expect(hit?.y).toBeCloseTo(72, 9);
  });

  it('stops at object footprints', () => {
    // Footprint of the object at tile (4, 2): x 208..224, y 112..128.
    const hit = castSegment(grid, 24, 120, 280, 120, BLOCKS_PROJECTILES);
    expect(hit?.x).toBeCloseTo(208, 9);
  });

  it('ignores flags outside the mask and returns undefined when clear', () => {
    expect(castSegment(grid, 24, 168, 280, 168, BLOCKS_PROJECTILES)).toBeUndefined();
    expect(castSegment(grid, 72, 168, 0, 168, BLOCKS_MOVEMENT)?.x).toBeCloseTo(48, 9);
  });

  it('handles vertical, diagonal, zero-length and outside segments', () => {
    expect(castSegment(grid, 120, 10, 120, 180, BLOCKS_PROJECTILES)?.y).toBeCloseTo(48, 9);
    expect(castSegment(grid, 30, 20, 140, 100, BLOCKS_PROJECTILES)).toBeDefined();
    expect(castSegment(grid, 20, 20, 20, 20, BLOCKS_PROJECTILES)).toBeUndefined();
    expect(castSegment(grid, 120, 72, 120, 72, BLOCKS_PROJECTILES)?.t).toBe(0);
    expect(castSegment(grid, 270, 10, 300, 10, BLOCKS_PROJECTILES)?.x).toBeCloseTo(288, 9);
  });

  it('gives line of sight', () => {
    expect(lineOfSight(grid, 24, 24, 260, 24)).toBe(true);
    expect(lineOfSight(grid, 24, 72, 260, 72)).toBe(false);
  });

  it('asks about each footprint met, once and in path order, until one stops the segment', () => {
    // Sandbags at tiles 1, 3 and 4 of a row, then a wall: cover blocks movement, not sight.
    const row = buildCollisionGrid(asciiMap('.s.ss#'));
    const mask = BLOCKS_PROJECTILES | TileFlag.cover;
    const asked: number[] = [];
    const passAll = (f: Footprint) => (asked.push(f.object!), true);
    expect(castSegment(row, 10, 24, 280, 24, mask, passAll)?.x).toBeCloseTo(240, 9);
    expect(asked).toEqual([1, 2, 3]);
    asked.length = 0;
    const stopAtSecond = (f: Footprint) => (asked.push(f.object!), f.object !== 2);
    expect(castSegment(row, 280 - 50, 24, 10, 24, mask, stopAtSecond)?.x).toBeCloseTo(192, 9);
    expect(asked).toEqual([3, 2]);
    expect(lineOfSight(row, 10, 24, 230, 24)).toBe(true);
    expect(circleBlocked(row, 72, 24, 10, BLOCKS_MOVEMENT)).toBe(true);
  });
});

describe('SpatialHash', () => {
  it('finds circles near a rectangle, once each, by id', () => {
    const hash = new SpatialHash(48);
    hash.insert(5, 10, 10, 5);
    hash.insert(2, 47, 47, 10);
    hash.insert(9, 300, 300, 5);
    hash.insert(7, -20, -20, 5);
    expect(hash.query(0, 0, 60, 60)).toEqual([2, 5]);
    expect(hash.query(-30, -30, -10, -10)).toEqual([7]);
    hash.clear();
    expect(hash.query(0, 0, 400, 400)).toEqual([]);
  });
});
