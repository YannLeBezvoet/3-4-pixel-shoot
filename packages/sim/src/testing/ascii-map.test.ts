import { describe, expect, it } from 'vitest';
import { TILE_SIZE, TileFlag } from '../map/map-data';
import { asciiMap } from './ascii-map';

describe('asciiMap', () => {
  it('builds tiles, objects and spawn areas from text', () => {
    const map = asciiMap(
      `
        ###
        #o2
        1~s
      `,
      'arena',
    );
    expect(map).toMatchObject({ id: 'arena', nameKey: 'map.arena', width: 3, height: 3 });
    const flags = map.layers[0]!.cells.map((cell) => map.tileTypes[cell]!.flags);
    const { solid, impassable, cover } = TileFlag;
    expect(flags).toEqual([solid, solid, solid, solid, 0, 0, 0, impassable, 0]);
    expect(map.objects).toEqual([
      {
        id: 1,
        x: TILE_SIZE * 1.5,
        y: TILE_SIZE + 32,
        footprints: [{ x: 64, y: 64, width: 16, height: 16, flags: solid, object: 1 }],
      },
      {
        id: 2,
        x: TILE_SIZE * 2.5,
        y: TILE_SIZE * 3,
        low: true,
        footprints: [
          { x: 96, y: 96, width: 48, height: 48, flags: cover, object: 2, bulletPassPercent: 40 },
        ],
      },
    ]);
    expect(map.spawns).toEqual([
      { team: 2, x: 96, y: 48, width: 48, height: 48 },
      { team: 1, x: 0, y: 96, width: 48, height: 48 },
    ]);
  });

  it('accepts an array of rows', () => {
    expect(asciiMap(['..', '..']).width).toBe(2);
  });

  it('rejects ragged rows, unknown characters and empty maps', () => {
    expect(() => asciiMap(['...', '..'])).toThrow('Row 1 has 2 characters, expected 3.');
    expect(() => asciiMap('.?.')).toThrow('Unknown map character "?" at column 1, row 0.');
    expect(() => asciiMap('  \n ')).toThrow('at least one row');
  });
});
