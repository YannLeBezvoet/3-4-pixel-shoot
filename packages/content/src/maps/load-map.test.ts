import { TileFlag } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { memoryFileProvider } from '../files/file-provider';
import type { ContentIssue } from '../issues/issues';
import { IssueCollector } from '../issues/issues';
import { parseLocale } from '../locales/locale';
import { loadMap } from './load-map';

const T = 'themes/t';
const MAP = `${T}/maps/test.tmj`;
const GROUND = `${T}/tilesets/ground.tsj`;
const TREE = `${T}/tilesets/tree.tsj`;

const prop = (name: string, type: string, value: unknown) => ({ name, type, value });
// Fixtures are edited freely by each test.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Files = Record<string, any>;

/** A valid 4×3 map with a ground layer, a roof layer, a tree and two spawn areas. */
function validFiles(): Files {
  return {
    [MAP]: {
      type: 'map',
      orientation: 'orthogonal',
      infinite: false,
      width: 4,
      height: 3,
      tilewidth: 48,
      tileheight: 48,
      properties: [prop('nameKey', 'string', 'map.test')],
      tilesets: [
        { firstgid: 1, source: '../tilesets/ground.tsj' },
        { firstgid: 9, source: '../tilesets/tree.tsj' },
      ],
      layers: [
        {
          type: 'tilelayer',
          id: 1,
          name: 'ground',
          class: 'ground',
          width: 4,
          height: 3,
          data: [1, 1, 2, 1, 1, 3, 1, 1, 3, 1, 1, 1],
        },
        {
          type: 'tilelayer',
          id: 2,
          name: 'roofs',
          class: 'overhead',
          width: 4,
          height: 3,
          data: [0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0],
        },
        {
          type: 'objectgroup',
          id: 3,
          name: 'trees',
          class: 'objects',
          objects: [{ id: 5, gid: 9, x: 96, y: 144, width: 96, height: 144 }],
        },
        {
          type: 'objectgroup',
          id: 4,
          name: 'spawns',
          class: 'gameplay',
          objects: [
            {
              id: 6,
              type: 'spawn',
              x: 0,
              y: 0,
              width: 96,
              height: 48,
              properties: [prop('team', 'int', 1)],
            },
            {
              id: 7,
              type: 'spawn',
              x: 96,
              y: 96,
              width: 96,
              height: 48,
              properties: [prop('team', 'int', 2)],
            },
          ],
        },
      ],
    },
    [GROUND]: {
      type: 'tileset',
      tilewidth: 48,
      tileheight: 48,
      tilecount: 8,
      columns: 4,
      image: 'ground.png',
      imagewidth: 192,
      imageheight: 96,
      tiles: [
        { id: 1, properties: [prop('solid', 'bool', true)] },
        { id: 2, properties: [prop('impassable', 'bool', true)] },
      ],
    },
    [`${T}/tilesets/ground.png`]: '',
    [TREE]: {
      type: 'tileset',
      tilewidth: 96,
      tileheight: 144,
      tilecount: 1,
      columns: 1,
      image: 'tree.png',
      tiles: [
        {
          id: 0,
          properties: [prop('solid', 'bool', true)],
          objectgroup: { objects: [{ id: 1, x: 40, y: 120, width: 16, height: 16 }] },
        },
      ],
    },
    [`${T}/tilesets/tree.png`]: '',
  };
}

function theme(translations: Record<string, unknown> = { en: { map: { test: 'Test' } } }) {
  const issues = new IssueCollector();
  return {
    dir: T,
    defaultLanguage: 'en',
    translations: new Map(
      Object.entries(translations).map(([language, json]) => [
        language,
        parseLocale(json, `${T}/locales/${language}.json`, issues, { requireMeta: false })!,
      ]),
    ),
  };
}

async function load(files: Record<string, unknown>, translations?: Record<string, unknown>) {
  const texts = Object.fromEntries(
    Object.entries(files).map(([p, v]) => [p, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  return loadMap(memoryFileProvider(texts), theme(translations), 'maps/test');
}

function broken(change: (files: Files) => void) {
  const files = structuredClone(validFiles());
  change(files);
  return files;
}

const error = (file: string, location: string, message: string): ContentIssue => ({
  severity: 'error',
  file,
  location,
  message,
});
const warning = (file: string, location: string, message: string): ContentIssue => ({
  severity: 'warning',
  file,
  location,
  message,
});

describe('loadMap', () => {
  it('reads a valid map into MapData', async () => {
    const { map, issues } = await load(validFiles());
    expect(issues).toEqual([]);
    expect(map).toMatchObject({ id: 'test', nameKey: 'map.test', width: 4, height: 3 });
    const image = 'tilesets/ground.png';
    expect(map?.tileTypes).toEqual([
      { flags: 0 },
      { flags: 0, visual: { image, x: 0, y: 0, width: 48, height: 48 } },
      { flags: TileFlag.solid, visual: { image, x: 48, y: 0, width: 48, height: 48 } },
      { flags: TileFlag.impassable, visual: { image, x: 96, y: 0, width: 48, height: 48 } },
      { flags: 0, visual: { image, x: 144, y: 0, width: 48, height: 48 } },
    ]);
    expect(map?.layers).toEqual([
      { name: 'ground', role: 'ground', cells: [1, 1, 2, 1, 1, 3, 1, 1, 3, 1, 1, 1] },
      { name: 'roofs', role: 'overhead', cells: [0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0] },
    ]);
    // The tree's picture spans x 96..192, y 0..144; its trunk box is at (40, 120) in the tile.
    expect(map?.objects).toEqual([
      {
        id: 5,
        x: 144,
        y: 144,
        visual: { image: 'tilesets/tree.png', x: 0, y: 0, width: 96, height: 144 },
        footprints: [{ x: 136, y: 120, width: 16, height: 16, flags: TileFlag.solid }],
      },
    ]);
    expect(map?.spawns).toEqual([
      { team: 1, x: 0, y: 0, width: 96, height: 48 },
      { team: 2, x: 96, y: 96, width: 96, height: 48 },
    ]);
  });

  it('lets a tile object override its tile flags', async () => {
    const { map } = await load(
      broken((f) => (f[MAP].layers[2].objects[0].properties = [prop('solid', 'bool', false)])),
    );
    expect(map?.objects[0]?.footprints).toEqual([]);
  });

  it('marks low objects from their tile, overridable on the object', async () => {
    const lowTile = (f: Files) => f[TREE].tiles[0].properties.push(prop('low', 'bool', true));
    const low = await load(broken(lowTile));
    expect(low.issues).toEqual([]);
    expect(low.map?.objects[0]).toMatchObject({ id: 5, low: true });
    const raised = await load(
      broken((f) => {
        lowTile(f);
        f[MAP].layers[2].objects[0].properties = [prop('low', 'bool', false)];
      }),
    );
    expect(raised.map?.objects[0]?.low).toBeUndefined();
  });

  it('refuses maps that are not orthogonal, infinite or not on a 48 px grid', async () => {
    const isometric = await load(broken((f) => (f[MAP].orientation = 'isometric')));
    expect(isometric.issues).toEqual([
      error(MAP, 'orientation', 'Only orthogonal maps are supported; this map is "isometric".'),
    ]);
    const infinite = await load(broken((f) => (f[MAP].infinite = true)));
    expect(infinite.issues).toEqual([
      error(
        MAP,
        'infinite',
        'Infinite maps are not supported: uncheck "Infinite" in the map properties.',
      ),
    ]);
    const small = await load(broken((f) => (f[MAP].tilewidth = 32)));
    expect(small.issues).toEqual([
      error(MAP, 'tilewidth', 'Map tiles are 32×48 px; they must be 48×48 px.'),
    ]);
  });

  it('requires a translated nameKey', async () => {
    const missing = await load(broken((f) => (f[MAP].properties = [])));
    expect(missing.issues).toEqual([
      error(
        MAP,
        'properties',
        'Missing map property "nameKey": the translation key of the map name (Map › Map Properties).',
      ),
    ]);
    const untranslated = await load(validFiles(), { en: {}, fr: {} });
    expect(untranslated.map).toBeUndefined();
    expect(untranslated.issues).toEqual([
      error(
        `${T}/locales/en.json`,
        '',
        `Missing translation "map.test" (used by ${MAP} › properties.nameKey).`,
      ),
      warning(
        `${T}/locales/fr.json`,
        '',
        'Missing translation "map.test": the "en" text will be shown.',
      ),
    ]);
  });

  it('requires external tilesets that exist', async () => {
    const embedded = await load(broken((f) => delete f[MAP].tilesets[1].source));
    expect(embedded.issues).toEqual([
      error(
        MAP,
        'tilesets[1]',
        'Tilesets must be external .tsj files: in Tiled, use "Export Tileset As…" and save it under tilesets/.',
      ),
    ]);
    const missing = await load(broken((f) => delete f[TREE]));
    expect(missing.issues).toEqual([
      error(TREE, '', `File not found (referenced by ${MAP} › tilesets[1]).`),
    ]);
    const noImage = await load(broken((f) => delete f[`${T}/tilesets/tree.png`]));
    expect(noImage.issues).toEqual([
      error(TREE, 'image', 'Tileset image not found: themes/t/tilesets/tree.png.'),
    ]);
    const collection = await load(broken((f) => delete f[TREE].image));
    expect(collection.issues[0]?.message).toMatch(
      /^Tilesets made of separate images are not supported/,
    );
  });

  it('accepts only rectangles as collision shapes', async () => {
    const { issues } = await load(
      broken((f) => (f[TREE].tiles[0].objectgroup.objects[0].ellipse = true)),
    );
    expect(issues).toEqual([
      error(
        TREE,
        'tile 0',
        'Collision shape 1 is an ellipse. Collision shapes are rectangles without rotation (Q55).',
      ),
    ]);
  });

  it('requires a known class on every layer', async () => {
    const none = await load(broken((f) => (f[MAP].layers[0].class = '')));
    expect(none.issues).toEqual([
      error(
        MAP,
        'layer "ground"',
        'The layer has no class. Set its class to one of "ground", "overhead", "objects", "gameplay" (Layer Properties › Class).',
      ),
    ]);
    const unknown = await load(broken((f) => (f[MAP].layers[1].class = 'roof')));
    expect(unknown.issues).toEqual([
      error(
        MAP,
        'layer "roofs"',
        'Unknown layer class "roof". Layer classes: "ground", "overhead", "objects", "gameplay".',
      ),
    ]);
    const wrongKind = await load(broken((f) => (f[MAP].layers[2].class = 'ground')));
    expect(wrongKind.issues).toEqual([
      error(MAP, 'layer "trees"', 'A layer of class "ground" must be a tile layer.'),
    ]);
    const group = await load(
      broken((f) => f[MAP].layers.push({ type: 'group', id: 9, name: 'misc', layers: [] })),
    );
    expect(group.issues).toEqual([
      error(
        MAP,
        'layer "misc"',
        'Group layers are not supported. Use tile layers and object layers with a class: "ground", "overhead", "objects", "gameplay".',
      ),
    ]);
  });

  it('requires CSV tile data with the map size', async () => {
    const base64 = await load(
      broken((f) => ((f[MAP].layers[0].data = 'AAAA'), (f[MAP].layers[0].encoding = 'base64'))),
    );
    expect(base64.issues).toEqual([
      error(
        MAP,
        'layer "ground"',
        'Tile data must be saved as CSV: set Map Properties › Tile Layer Format to "CSV".',
      ),
    ]);
    const short = await load(broken((f) => f[MAP].layers[0].data.pop()));
    expect(short.issues).toEqual([
      error(MAP, 'layer "ground"', "The layer must have the map's size (4×3 tiles)."),
    ]);
  });

  it('reports bad tiles with their position and how many there are', async () => {
    const flipped = await load(broken((f) => (f[MAP].layers[0].data[5] = 0x80000001)));
    expect(flipped.issues).toEqual([
      error(MAP, 'layer "ground"', 'tile (1, 1): flipped or rotated tiles are not supported.'),
    ]);
    const big = await load(
      broken(
        (f) =>
          (f[MAP].layers[0].data = f[MAP].layers[0].data.map((g: number, i: number) =>
            i >= 10 ? 9 : g,
          )),
      ),
    );
    expect(big.issues).toEqual([
      error(
        MAP,
        'layer "ground"',
        `tile (2, 2): tiles of ${TREE} are 96×144 px; tile layers use 48×48 px tiles. Place larger pictures as tile objects in an "objects" layer. (and 1 more tiles)`,
      ),
    ]);
    const unknown = await load(broken((f) => (f[MAP].layers[0].data[0] = 50)));
    expect(unknown.issues).toEqual([error(MAP, 'layer "ground"', 'tile (0, 0): unknown tile 50.')]);
  });

  it('checks tile objects', async () => {
    const shape = await load(
      broken((f) => f[MAP].layers[2].objects.push({ id: 8, x: 10, y: 20, width: 30, height: 30 })),
    );
    expect(shape.issues).toEqual([
      error(
        MAP,
        'layer "trees" › object 8 at (10, 20)',
        'An "objects" layer holds tile objects only (Insert Tile). Put spawn areas in a "gameplay" layer.',
      ),
    ]);
    const resized = await load(broken((f) => (f[MAP].layers[2].objects[0].width = 48)));
    expect(resized.issues).toEqual([
      error(
        MAP,
        'layer "trees" › object 5 at (96, 144)',
        "The object is resized to 48×144 px; tile objects keep their tile's size (96×144 px).",
      ),
    ]);
    const noShape = await load(broken((f) => delete f[TREE].tiles[0].objectgroup));
    expect(noShape.map).toBeDefined();
    expect(noShape.issues).toEqual([
      warning(
        MAP,
        'layer "trees" › object 5 at (96, 144)',
        "The tile is solid but has no collision shape, so it blocks nothing. Draw its shapes in the tileset's collision editor.",
      ),
    ]);
  });

  it('checks spawn areas and their team', async () => {
    const point = await load(
      broken(
        (f) => (
          (f[MAP].layers[3].objects[0].point = true),
          (f[MAP].layers[3].objects[0].width = 0)
        ),
      ),
    );
    expect(point.issues).toEqual([
      error(
        MAP,
        'layer "spawns" › object 6 at (0, 0)',
        'A spawn area is a rectangle without rotation (Q52); this one is a point.',
      ),
    ]);
    const unknown = await load(broken((f) => (f[MAP].layers[3].objects[1].type = 'zone')));
    expect(unknown.issues).toEqual([
      error(
        MAP,
        'layer "spawns" › object 7 at (96, 96)',
        'Unknown gameplay object class "zone". Gameplay objects: "spawn".',
      ),
    ]);
    const typed = await load(
      broken((f) => (f[MAP].layers[3].objects[1].properties = [prop('team', 'string', 'two')])),
    );
    expect(typed.issues).toEqual([
      error(
        MAP,
        'layer "spawns" › object 7 at (96, 96)',
        'Property "team" must be of type int, got "two".',
      ),
    ]);
    // Tiled 1.9 saved the class as "class": both spellings are read.
    const classField = await load(
      broken((f) => {
        const spawn = f[MAP].layers[3].objects[1];
        spawn.class = spawn.type;
        delete spawn.type;
      }),
    );
    expect(classField.issues).toEqual([]);
  });

  it('warns about unknown properties, usually typos', async () => {
    const { map, issues } = await load(
      broken((f) => f[GROUND].tiles[0].properties.push(prop('soild', 'bool', true))),
    );
    expect(map).toBeDefined();
    expect(issues).toEqual([
      warning(
        GROUND,
        'tile 1',
        'Unknown property "soild" (ignored). Known properties here: "solid", "impassable", "low".',
      ),
    ]);
  });
});
