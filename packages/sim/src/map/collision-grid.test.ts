import { describe, expect, it } from 'vitest';
import { asciiMap } from '../testing/ascii-map';
import { buildCollisionGrid, tileOf } from './collision-grid';
import type { MapData } from './map-data';
import { TILE_SIZE, TileFlag } from './map-data';

describe('buildCollisionGrid', () => {
  const map = asciiMap(`
    #####
    #1~o#
    #####
  `);
  const grid = buildCollisionGrid(map);

  it('takes tile flags from the ground layers', () => {
    expect(grid.width).toBe(5);
    expect(grid.height).toBe(3);
    expect(grid.flagsAt(0, 0)).toBe(TileFlag.solid);
    expect(grid.flagsAt(1, 1)).toBe(0);
    expect(grid.flagsAt(2, 1)).toBe(TileFlag.impassable);
  });

  it('treats everything outside the map as solid', () => {
    for (const [x, y] of [
      [-1, 0],
      [0, -1],
      [5, 1],
      [2, 3],
    ] as const)
      expect(grid.flagsAt(x, y)).toBe(TileFlag.solid);
    expect(grid.footprintsAt(-1, 0)).toEqual([]);
  });

  it('indexes footprints by every tile they touch', () => {
    expect(grid.footprintsAt(3, 1)).toHaveLength(1);
    expect(grid.footprintsAt(2, 1)).toHaveLength(0);
    const wide: MapData = {
      ...map,
      objects: [
        {
          id: 9,
          x: 0,
          y: 0,
          footprints: [{ x: 40, y: 40, width: 60, height: 9, flags: TileFlag.solid }],
        },
      ],
    };
    const wideGrid = buildCollisionGrid(wide);
    expect([0, 1, 2].map((x) => wideGrid.footprintsAt(x, 0).length)).toEqual([1, 1, 1]);
    expect(wideGrid.footprintsAt(3, 0)).toHaveLength(0);
    expect(wideGrid.footprintsAt(0, 1)).toHaveLength(1);
    // A box ending exactly on a tile edge does not touch the next tile.
    const edge: MapData = {
      ...map,
      objects: [
        { id: 1, x: 0, y: 0, footprints: [{ x: 0, y: 0, width: 48, height: 48, flags: 1 }] },
      ],
    };
    const edgeGrid = buildCollisionGrid(edge);
    expect([edgeGrid.footprintsAt(1, 0), edgeGrid.footprintsAt(0, 1)]).toEqual([[], []]);
  });

  it('combines the flags of several ground layers and ignores overhead layers', () => {
    const cells = map.layers[0]?.cells.map(() => 3) ?? [];
    const layered: MapData = {
      ...map,
      layers: [...map.layers, { name: 'roofs', role: 'overhead', cells }],
    };
    expect(buildCollisionGrid(layered).flagsAt(1, 1)).toBe(0);
    const doubled: MapData = {
      ...layered,
      layers: [...map.layers, { ...layered.layers[1]!, role: 'ground' }],
    };
    expect(buildCollisionGrid(doubled).flagsAt(0, 0)).toBe(TileFlag.solid | TileFlag.impassable);
  });

  it('refuses inconsistent data', () => {
    expect(() =>
      buildCollisionGrid({ ...map, layers: [{ name: 'bad', role: 'ground', cells: [1] }] }),
    ).toThrow('Layer "bad" has 1 cells, expected 15.');
    const cells = map.layers[0]?.cells.map(() => 99) ?? [];
    expect(() =>
      buildCollisionGrid({ ...map, layers: [{ name: 'bad', role: 'ground', cells }] }),
    ).toThrow('unknown tile type 99');
  });
});

describe('tileOf', () => {
  it('maps world coordinates to tiles, including negative ones', () => {
    expect(tileOf(0)).toBe(0);
    expect(tileOf(TILE_SIZE - 0.01)).toBe(0);
    expect(tileOf(TILE_SIZE)).toBe(1);
    expect(tileOf(-1)).toBe(-1);
  });
});
