// The map of the example theme (Q60): a small 40×30 training ground with walls and crates to
// move around, and one spawn area at each end. Ground tiles only: no tile objects.
import type { GroundTile } from './tiles';
import { GROUND_TILES } from './tiles';
import { TILED, property, stringify } from './vietnam-map';

const T = 48;
const W = 40;
const H = 30;

export const EXAMPLE_SPAWNS = [
  { team: 1, x: 2, y: 11, w: 4, h: 8 },
  { team: 2, x: 34, y: 11, w: 4, h: 8 },
] as const;

export function exampleMap(): string {
  const ground: GroundTile[] = new Array<GroundTile>(W * H).fill('dirt');
  const set = (x: number, y: number, tile: GroundTile) => (ground[y * W + x] = tile);
  // A path across the middle, wall blocks and crates placed symmetrically.
  for (let x = 0; x < W; x++) set(x, 15, 'path');
  const blocks: [number, number, number, number][] = [
    [10, 5, 1, 6],
    [10, 19, 1, 6],
    [19, 9, 2, 1],
    [19, 20, 2, 1],
    [14, 13, 1, 4],
  ];
  for (const [bx, by, bw, bh] of blocks)
    for (const x0 of [bx, W - bx - bw])
      for (let y = by; y < by + bh; y++)
        for (let x = x0; x < x0 + bw; x++) set(x, y, 'stone-wall-top');
  for (const [x, y] of [
    [7, 8],
    [7, 21],
    [18, 3],
    [18, 26],
  ] as const) {
    set(x, y, 'crate');
    set(W - 1 - x, y, 'crate');
  }
  const gid = (tile: GroundTile) => GROUND_TILES.indexOf(tile) + 1;
  return stringify(
    {
      type: 'map',
      ...TILED,
      class: 'map',
      orientation: 'orthogonal',
      renderorder: 'right-down',
      infinite: false,
      compressionlevel: -1,
      width: W,
      height: H,
      tilewidth: T,
      tileheight: T,
      nextlayerid: 3,
      nextobjectid: EXAMPLE_SPAWNS.length + 1,
      properties: [property('nameKey', 'string', 'map.arena')],
      tilesets: [{ firstgid: 1, source: '../tilesets/training-ground.tsj' }],
      layers: [
        {
          type: 'tilelayer',
          id: 1,
          name: 'ground',
          class: 'ground',
          x: 0,
          y: 0,
          width: W,
          height: H,
          opacity: 1,
          visible: true,
          data: ground.map(gid),
        },
        {
          type: 'objectgroup',
          id: 2,
          name: 'spawns',
          class: 'gameplay',
          draworder: 'index',
          x: 0,
          y: 0,
          opacity: 1,
          visible: true,
          objects: EXAMPLE_SPAWNS.map((spawn, i) => ({
            id: i + 1,
            name: `team ${spawn.team}`,
            type: 'spawn',
            rotation: 0,
            visible: true,
            x: spawn.x * T,
            y: spawn.y * T,
            width: spawn.w * T,
            height: spawn.h * T,
            properties: [property('team', 'int', spawn.team)],
          })),
        },
      ],
    },
    W,
  );
}
