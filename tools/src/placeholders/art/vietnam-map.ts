// The first Vietnam map (Q27), generated as Tiled files the owner can then edit: a jungle edge
// in the west, rice paddies, a river crossed by two bridges and a ford, a village in the east.
// About 80×60 tiles. Spawn areas: team 1 in a western clearing, team 2 on the eastern edge.
import { createRng } from '@pixel-shoot/shared';
import type { GroundTile } from './tiles';
import { GROUND_COLUMNS, GROUND_TILES, TREE_TRUNK } from './tiles';

const T = 48;
export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 60;

/** Tiled versions written in the files, matching what Tiled itself saves. */
export const TILED = { version: '1.10', tiledversion: '1.11.2' };

const SOLID: readonly GroundTile[] = [
  'stone-wall-top',
  'stone-wall-front',
  'sandbags',
  'bamboo-wall',
  'crate',
  'fence',
  'rock',
];
const IMPASSABLE: readonly GroundTile[] = ['water'];

export const property = (name: string, type: string, value: unknown) => ({
  name,
  type,
  value,
});

/** Tiled JSON with tile data written one map row per line, as Tiled's CSV format reads. */
export function stringify(value: unknown, width: number): string {
  const rows: string[] = [];
  const text = JSON.stringify(
    value,
    (key, v: unknown) => {
      if (key !== 'data' || !Array.isArray(v)) return v;
      rows.push(
        Array.from({ length: Math.ceil(v.length / width) }, (_, r) =>
          v.slice(r * width, (r + 1) * width).join(','),
        ).join(',\n'),
      );
      return `@@data${rows.length - 1}@@`;
    },
    1,
  );
  return `${text.replace(/"@@data(\d+)@@"/g, (_, i: string) => `[\n${rows[Number(i)]}\n]`)}\n`;
}

/** The ground tileset (.tsj) over an image of GROUND_TILES; `name` is also the image's name. */
export function groundTileset(name = 'jungle-ground'): string {
  const tiles = GROUND_TILES.map((name, id) => {
    const properties = [
      ...(SOLID.includes(name) ? [property('solid', 'bool', true)] : []),
      ...(IMPASSABLE.includes(name) ? [property('impassable', 'bool', true)] : []),
    ];
    return properties.length > 0 ? { id, type: 'tile', properties } : undefined;
  }).filter((tile) => tile !== undefined);
  const rows = Math.ceil(GROUND_TILES.length / GROUND_COLUMNS);
  return stringify(
    {
      type: 'tileset',
      ...TILED,
      name,
      tilewidth: T,
      tileheight: T,
      tilecount: GROUND_TILES.length,
      columns: GROUND_COLUMNS,
      image: `${name}.png`,
      imagewidth: GROUND_COLUMNS * T,
      imageheight: rows * T,
      margin: 0,
      spacing: 0,
      tiles,
    },
    1,
  );
}

export function treeTileset(): string {
  return stringify(
    {
      type: 'tileset',
      ...TILED,
      name: 'jungle-tree',
      tilewidth: 2 * T,
      tileheight: 3 * T,
      tilecount: 1,
      columns: 1,
      image: 'jungle-tree.png',
      imagewidth: 2 * T,
      imageheight: 3 * T,
      margin: 0,
      spacing: 0,
      tiles: [
        {
          id: 0,
          type: 'tile',
          properties: [property('solid', 'bool', true)],
          objectgroup: {
            draworder: 'index',
            id: 2,
            name: '',
            opacity: 1,
            type: 'objectgroup',
            visible: true,
            x: 0,
            y: 0,
            objects: [{ id: 1, name: '', type: '', rotation: 0, visible: true, ...TREE_TRUNK }],
          },
        },
      ],
    },
    1,
  );
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SPAWNS: readonly (Rect & { team: number })[] = [
  { team: 1, x: 2, y: 26, w: 6, h: 8 },
  { team: 2, x: 73, y: 26, w: 6, h: 8 },
];

export function vietnamMap(): string {
  const W = MAP_WIDTH;
  const H = MAP_HEIGHT;
  const rng = createRng('river-village');
  const ground: GroundTile[] = new Array<GroundTile>(W * H).fill('grass');
  const roof: (GroundTile | undefined)[] = new Array<GroundTile | undefined>(W * H).fill(undefined);
  const get = (x: number, y: number) => ground[y * W + x];
  const set = (x: number, y: number, tile: GroundTile) => {
    if (x >= 0 && y >= 0 && x < W && y < H) ground[y * W + x] = tile;
  };
  const fill = (r: Rect, tile: GroundTile) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, tile);
  };
  /** Tiles where nothing may be placed: spawn areas and their surroundings, paths, huts. */
  const reserved = new Set<number>();
  const reserve = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) reserved.add(y * W + x);
  };

  // Grass with some flowers and tall grass.
  for (let i = 0; i < W * H; i++) {
    const roll = rng.next();
    if (roll < 0.03) ground[i] = 'grass-flowers';
    else if (roll < 0.08) ground[i] = 'tall-grass';
  }

  // Jungle edge along the west side, with a ragged border.
  const jungleEdge: number[] = [];
  for (let y = 0; y < H; y++) {
    const edge = 11 + Math.round(2 * Math.sin(y / 5) + rng.range(-1, 1));
    jungleEdge.push(edge);
    for (let x = 0; x < edge; x++) set(x, y, rng.chance(0.12) ? 'tall-grass' : 'jungle-floor');
  }

  // Rice paddies: plots of 5×4 tiles separated by path dikes.
  const paddies: Rect[] = [
    { x: 16, y: 4, w: 18, h: 17 },
    { x: 47, y: 44, w: 30, h: 13 },
  ];
  for (const area of paddies) {
    fill(area, 'path');
    for (let py = area.y + 1; py + 4 <= area.y + area.h; py += 5)
      for (let px = area.x + 1; px + 5 <= area.x + area.w; px += 6)
        fill({ x: px, y: py, w: 5, h: 4 }, 'rice-paddy');
  }

  // The river: three tiles wide, meandering from north to south.
  const riverX = (y: number) => 40 + Math.round(3 * Math.sin(y / 9));
  const crossings = new Map<number, GroundTile>([
    [14, 'bridge'],
    [15, 'bridge'],
    [30, 'ford'],
    [31, 'ford'],
    [46, 'bridge'],
    [47, 'bridge'],
  ]);
  for (let y = 0; y < H; y++) {
    const cx = riverX(y);
    const crossing = crossings.get(y);
    for (let x = cx - 1; x <= cx + 1; x++) {
      set(x, y, crossing ?? 'water');
      reserved.add(y * W + x);
    }
    // Muddy banks.
    for (const x of [cx - 2, cx + 2]) if (!crossing && rng.chance(0.6)) set(x, y, 'mud');
  }

  // Paths: west spawn → ford → village → east spawn; north and south to the bridges.
  const path = (x0: number, y0: number, x1: number, y1: number) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (get(x, y0) !== 'water' && get(x, y0) !== 'ford' && get(x, y0) !== 'bridge')
        set(x, y0, 'path');
      reserved.add(y0 * W + x);
    }
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      if (get(x1, y) !== 'water' && get(x1, y) !== 'ford' && get(x1, y) !== 'bridge')
        set(x1, y, 'path');
      reserved.add(y * W + x1);
    }
  };
  path(8, 30, 60, 30);
  path(60, 30, 72, 30);
  path(30, 14, 60, 14);
  path(60, 14, 60, 46);
  path(30, 46, 60, 46);
  path(30, 14, 30, 46);

  // Village: four huts around the crossroads, bamboo walls with a door facing the path.
  const huts: (Rect & { door: 'north' | 'south' })[] = [
    { x: 52, y: 22, w: 5, h: 4, door: 'south' },
    { x: 63, y: 22, w: 6, h: 4, door: 'south' },
    { x: 52, y: 33, w: 5, h: 4, door: 'north' },
    { x: 63, y: 33, w: 6, h: 5, door: 'north' },
  ];
  for (const hut of huts) {
    fill(hut, 'bamboo-wall');
    fill({ x: hut.x + 1, y: hut.y + 1, w: hut.w - 2, h: hut.h - 2 }, 'hut-floor');
    const doorX = hut.x + Math.floor(hut.w / 2);
    set(doorX, hut.door === 'south' ? hut.y + hut.h - 1 : hut.y, 'hut-floor');
    reserve({ x: hut.x - 1, y: hut.y - 1, w: hut.w + 2, h: hut.h + 2 });
    for (let y = hut.y; y < hut.y + hut.h; y++)
      for (let x = hut.x; x < hut.x + hut.w; x++)
        roof[y * W + x] = y === hut.y + hut.h - 1 ? 'thatch-roof-edge' : 'thatch-roof';
  }
  // Crates, a fence and a ruined stone wall.
  for (const [x, y] of [
    [58, 25],
    [58, 26],
    [70, 36],
    [51, 37],
  ] as const)
    set(x, y, 'crate');
  fill({ x: 63, y: 40, w: 7, h: 1 }, 'fence');
  fill({ x: 22, y: 36, w: 5, h: 1 }, 'stone-wall-top');
  fill({ x: 22, y: 37, w: 5, h: 1 }, 'stone-wall-front');
  set(24, 37, 'rubble');
  set(27, 37, 'rubble');
  fill({ x: 45, y: 26, w: 3, h: 1 }, 'sandbags');
  set(46, 26, 'bamboo-wall-destroyed');

  // Spawn areas stay clear.
  for (const spawn of SPAWNS) {
    fill(spawn, spawn.team === 1 ? 'jungle-floor' : 'grass');
    reserve({ x: spawn.x - 1, y: spawn.y - 1, w: spawn.w + 2, h: spawn.h + 2 });
  }

  // Rocks here and there in the open.
  for (let i = 0; i < W * H; i++) {
    const tile = ground[i];
    if (!reserved.has(i) && (tile === 'grass' || tile === 'tall-grass') && rng.chance(0.006))
      ground[i] = 'rock';
  }

  // Trees: dense in the jungle, scattered elsewhere, never on paths, water, paddies or huts.
  const trees: { x: number; y: number }[] = [];
  const treeTiles = new Set<number>();
  const canGrow = (x: number, y: number) => {
    if (x < 1 || y < 3 || x >= W - 1 || y >= H) return false;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const i = (y + dy) * W + (x + dx);
        if (treeTiles.has(i) || reserved.has(i)) return false;
      }
    const tile = get(x, y);
    return (
      tile === 'grass' ||
      tile === 'tall-grass' ||
      tile === 'jungle-floor' ||
      tile === 'grass-flowers'
    );
  };
  for (let y = 3; y < H; y++)
    for (let x = 1; x < W - 1; x++) {
      const inJungle = x < (jungleEdge[y] ?? 0);
      if (rng.chance(inJungle ? 0.3 : 0.025) && canGrow(x, y)) {
        trees.push({ x, y });
        treeTiles.add(y * W + x);
      }
    }

  const groundGid = (tile: GroundTile) => GROUND_TILES.indexOf(tile) + 1;
  const treeGid = GROUND_TILES.length + 1;
  let nextObjectId = 1;
  const treeObjects = trees.map(({ x, y }) => ({
    id: nextObjectId++,
    gid: treeGid,
    name: '',
    type: '',
    rotation: 0,
    visible: true,
    // A tile object is placed by its bottom-left corner; the trunk stands on the tile.
    x: x * T + T / 2 - T,
    y: y * T + T - 4,
    width: 2 * T,
    height: 3 * T,
  }));
  const spawnObjects = SPAWNS.map((spawn) => ({
    id: nextObjectId++,
    name: `team ${spawn.team}`,
    type: 'spawn',
    rotation: 0,
    visible: true,
    x: spawn.x * T,
    y: spawn.y * T,
    width: spawn.w * T,
    height: spawn.h * T,
    properties: [property('team', 'int', spawn.team)],
  }));
  const tileLayer = (id: number, name: string, cls: string, data: number[]) => ({
    type: 'tilelayer',
    id,
    name,
    class: cls,
    x: 0,
    y: 0,
    width: W,
    height: H,
    opacity: 1,
    visible: true,
    data,
  });
  const objectLayer = (id: number, name: string, cls: string, objects: object[]) => ({
    type: 'objectgroup',
    id,
    name,
    class: cls,
    draworder: cls === 'objects' ? 'topdown' : 'index',
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    objects,
  });

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
      nextlayerid: 5,
      nextobjectid: nextObjectId,
      properties: [property('nameKey', 'string', 'map.river-village')],
      tilesets: [
        { firstgid: 1, source: '../tilesets/jungle-ground.tsj' },
        { firstgid: treeGid, source: '../tilesets/jungle-tree.tsj' },
      ],
      layers: [
        tileLayer(1, 'ground', 'ground', ground.map(groundGid)),
        objectLayer(2, 'trees', 'objects', treeObjects),
        tileLayer(
          3,
          'roofs',
          'overhead',
          roof.map((tile) => (tile ? groundGid(tile) : 0)),
        ),
        objectLayer(4, 'spawns', 'gameplay', spawnObjects),
      ],
    },
    W,
  );
}
