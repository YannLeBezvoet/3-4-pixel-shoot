// Reads a Tiled map (.tmj) with its external tilesets (.tsj) into engine-neutral MapData
// (decision 0008). Supports a documented subset of Tiled and explains everything it refuses,
// naming the file, the layer, the object and its position.
import type {
  Footprint,
  MapData,
  MapObject,
  SpawnArea,
  TileLayer,
  TileType,
  TileVisual,
} from '@pixel-shoot/sim';
import { TILE_SIZE, TileFlag } from '@pixel-shoot/sim';
import type { FileProvider } from '../files/file-provider';
import { joinPath } from '../files/file-provider';
import { readJson } from '../files/read-json';
import type { ContentIssue } from '../issues/issues';
import { IssueCollector } from '../issues/issues';
import { validate } from '../issues/zod';
import type { Locale } from '../locales/locale';
import { hasKey } from '../locales/locale';
import type { LayerClass, PropertyDefinition } from './properties';
import {
  GAMEPLAY_OBJECT_CLASSES,
  LAYER_CLASSES,
  MAP_PROPERTIES,
  SPAWN_PROPERTIES,
  TILE_FLAG_PROPERTIES,
  TILE_PROPERTIES,
} from './properties';
import type { TiledObject, TiledProperty } from './tiled-json';
import { tiledMap, tiledTileset } from './tiled-json';

/** Largest map side, in tiles. */
export const MAX_MAP_SIZE = 512;

const FLIP_FLAGS = 0xf0000000;

/** What a map needs from its theme. */
export interface MapTheme {
  /** Theme folder, e.g. "themes/vietnam". */
  readonly dir: string;
  readonly defaultLanguage: string;
  readonly translations: ReadonlyMap<string, Locale>;
}

export interface LoadMapResult {
  /** Undefined when the map has errors. */
  readonly map: MapData | undefined;
  readonly issues: readonly ContentIssue[];
}

/**
 * Where maps come from (ARCHITECTURE §9): Tiled files today, a generator later. A map is
 * named by a reference such as "maps/river-village".
 */
export interface MapSource {
  load(ref: string): Promise<LoadMapResult>;
}

/** Maps read from a theme's Tiled files. */
export function tiledMapSource(files: FileProvider, theme: MapTheme): MapSource {
  return { load: (ref) => loadMap(files, theme, ref) };
}

/** File of a map: "maps/river-village" → "<theme>/maps/river-village.tmj". */
export function mapFile(themeDir: string, ref: string): string {
  return joinPath(themeDir, `${ref}.tmj`);
}

const dirOf = (file: string) => file.split('/').slice(0, -1).join('/');
const where = (x: number, y: number) => `(${Math.round(x)}, ${Math.round(y)})`;
const listOf = (items: Iterable<string>) => [...items].map((i) => `"${i}"`).join(', ');

/**
 * Reads typed properties by name, reporting wrong types and warning about unknown names
 * (usually typos). Missing properties take their default.
 */
function readProperties<D extends Record<string, PropertyDefinition>>(
  list: readonly TiledProperty[],
  definitions: D,
  file: string,
  location: string,
  issues: IssueCollector,
): { values: { [K in keyof D]: D[K]['default'] }; set: Set<string> } {
  const values = Object.fromEntries(
    Object.entries(definitions).map(([name, d]) => [name, d.default]),
  ) as { [K in keyof D]: D[K]['default'] };
  const set = new Set<string>();
  for (const property of list) {
    const definition = definitions[property.name];
    if (!definition) {
      issues.warning(
        file,
        location,
        `Unknown property "${property.name}" (ignored). Known properties here: ${listOf(Object.keys(definitions)) || '(none)'}.`,
      );
      continue;
    }
    const expected = definition.type;
    const valid =
      expected === 'bool'
        ? typeof property.value === 'boolean'
        : expected === 'int'
          ? Number.isInteger(property.value)
          : typeof property.value === 'string';
    if (!valid) {
      issues.error(
        file,
        location,
        `Property "${property.name}" must be of type ${expected}, got ${JSON.stringify(property.value)}.`,
      );
      continue;
    }
    (values as Record<string, unknown>)[property.name] = property.value;
    set.add(property.name);
  }
  return { values, set };
}

function tileFlags(values: { [K in keyof typeof TILE_FLAG_PROPERTIES]: boolean }): number {
  let flags = 0;
  for (const [name, flag] of Object.entries(TILE_FLAG_PROPERTIES))
    if (values[name as keyof typeof TILE_FLAG_PROPERTIES]) flags |= flag;
  return flags;
}

/** The bullet pass chance of cover, reporting a value outside 0–100 and keeping it in range. */
function passPercent(value: number, file: string, location: string, issues: IssueCollector) {
  if (value >= 0 && value <= 100) return value;
  issues.error(
    file,
    location,
    `Property "bulletPassPercent" must be between 0 and 100, got ${value}.`,
  );
  return Math.min(100, Math.max(0, value));
}

/** Names of the flags set, for messages: "solid", "cover"… */
const flagNames = (flags: number) =>
  Object.entries(TILE_FLAG_PROPERTIES)
    .filter(([, flag]) => flags & flag)
    .map(([name]) => name);

/** Why a shape is not a plain rectangle, or undefined when it is one. */
function notARectangle(object: TiledObject): string | undefined {
  if (object.ellipse) return 'an ellipse';
  if (object.point) return 'a point';
  if (object.polygon) return 'a polygon';
  if (object.polyline) return 'a polyline';
  if (object.text !== undefined) return 'a text';
  if (object.width <= 0 || object.height <= 0) return 'a rectangle of zero size';
  return undefined;
}

/** Properties of a tileset tile, defaults of the tile objects placed from it. */
interface TileProperties {
  readonly flags: number;
  readonly low: boolean;
  readonly bulletPassPercent: number;
}

interface LoadedTileset {
  readonly file: string;
  readonly firstgid: number;
  readonly tilecount: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  /** Image path relative to the theme folder. */
  readonly image: string;
  readonly columns: number;
  readonly margin: number;
  readonly spacing: number;
  readonly tiles: ReadonlyMap<number, TileProperties & { footprints: readonly Footprint[] }>;
}

async function loadTileset(
  files: FileProvider,
  theme: MapTheme,
  file: string,
  firstgid: number,
  referencedBy: string,
  issues: IssueCollector,
): Promise<LoadedTileset | undefined> {
  const raw = await readJson(files, file, issues, { referencedBy });
  if (raw === undefined) return undefined;
  const tileset = validate(tiledTileset, raw, file, issues);
  if (!tileset) return undefined;
  if (!tileset.image) {
    issues.error(
      file,
      'image',
      'Tilesets made of separate images are not supported: use one image for the whole tileset (Tileset › New Tileset › Based on Tileset Image).',
    );
    return undefined;
  }
  const imagePath = joinPath(dirOf(file), tileset.image);
  if (!imagePath.startsWith(`${theme.dir}/`)) {
    issues.error(file, 'image', `The image "${tileset.image}" must be inside the theme folder.`);
    return undefined;
  }
  if (!(await files.exists(imagePath))) {
    issues.error(file, 'image', `Tileset image not found: ${imagePath}.`);
    return undefined;
  }

  const tiles = new Map<number, TileProperties & { footprints: Footprint[] }>();
  for (const tile of tileset.tiles) {
    const location = `tile ${tile.id}`;
    const { values } = readProperties(tile.properties, TILE_PROPERTIES, file, location, issues);
    const flags = tileFlags(values);
    const footprints: Footprint[] = [];
    for (const shape of tile.objectgroup?.objects ?? []) {
      const problem = notARectangle(shape) ?? (shape.rotation !== 0 ? 'rotated' : undefined);
      if (problem) {
        issues.error(
          file,
          location,
          `Collision shape ${shape.id} is ${problem}. Collision shapes are rectangles without rotation (Q55).`,
        );
        continue;
      }
      footprints.push({ x: shape.x, y: shape.y, width: shape.width, height: shape.height, flags });
    }
    tiles.set(tile.id, {
      flags,
      low: values.low,
      bulletPassPercent: passPercent(values.bulletPassPercent, file, location, issues),
      footprints,
    });
  }
  return {
    file,
    firstgid,
    tilecount: tileset.tilecount,
    tileWidth: tileset.tilewidth,
    tileHeight: tileset.tileheight,
    image: imagePath.slice(theme.dir.length + 1),
    columns: Math.max(1, tileset.columns),
    margin: tileset.margin,
    spacing: tileset.spacing,
    tiles,
  };
}

function visualOf(tileset: LoadedTileset, localId: number): TileVisual {
  const column = localId % tileset.columns;
  const row = Math.floor(localId / tileset.columns);
  return {
    image: tileset.image,
    x: tileset.margin + column * (tileset.tileWidth + tileset.spacing),
    y: tileset.margin + row * (tileset.tileHeight + tileset.spacing),
    width: tileset.tileWidth,
    height: tileset.tileHeight,
  };
}

export async function loadMap(
  files: FileProvider,
  theme: MapTheme,
  ref: string,
): Promise<LoadMapResult> {
  const issues = new IssueCollector();
  const file = mapFile(theme.dir, ref);
  const done = (map?: MapData): LoadMapResult => ({
    map: issues.hasErrors ? undefined : map,
    issues: issues.issues,
  });

  const raw = await readJson(files, file, issues);
  if (raw === undefined) return done();
  const tiled = validate(tiledMap, raw, file, issues);
  if (!tiled) return done();

  // 1. The supported subset of Tiled.
  if (tiled.orientation !== 'orthogonal')
    issues.error(
      file,
      'orientation',
      `Only orthogonal maps are supported; this map is "${tiled.orientation}".`,
    );
  if (tiled.infinite)
    issues.error(
      file,
      'infinite',
      'Infinite maps are not supported: uncheck "Infinite" in the map properties.',
    );
  if (tiled.tilewidth !== TILE_SIZE || tiled.tileheight !== TILE_SIZE)
    issues.error(
      file,
      'tilewidth',
      `Map tiles are ${tiled.tilewidth}×${tiled.tileheight} px; they must be ${TILE_SIZE}×${TILE_SIZE} px.`,
    );
  if (tiled.width > MAX_MAP_SIZE || tiled.height > MAX_MAP_SIZE)
    issues.error(
      file,
      'width',
      `The map is ${tiled.width}×${tiled.height} tiles; the largest supported side is ${MAX_MAP_SIZE} tiles.`,
    );
  if (issues.hasErrors) return done();

  // 2. Map properties.
  const { values: mapProps } = readProperties(
    tiled.properties,
    MAP_PROPERTIES,
    file,
    'properties',
    issues,
  );
  const nameKey = mapProps.nameKey;
  if (nameKey === '') {
    issues.error(
      file,
      'properties',
      'Missing map property "nameKey": the translation key of the map name (Map › Map Properties).',
    );
  } else {
    for (const [language, locale] of theme.translations) {
      if (hasKey(locale, nameKey)) continue;
      const localeFile = joinPath(theme.dir, 'locales', `${language}.json`);
      if (language === theme.defaultLanguage)
        issues.error(
          localeFile,
          '',
          `Missing translation "${nameKey}" (used by ${file} › properties.nameKey).`,
        );
      else
        issues.warning(
          localeFile,
          '',
          `Missing translation "${nameKey}": the "${theme.defaultLanguage}" text will be shown.`,
        );
    }
  }

  // 3. Tilesets, all external.
  const tilesets: LoadedTileset[] = [];
  for (const [index, entry] of tiled.tilesets.entries()) {
    if (!entry.source) {
      issues.error(
        file,
        `tilesets[${index}]`,
        'Tilesets must be external .tsj files: in Tiled, use "Export Tileset As…" and save it under tilesets/.',
      );
      continue;
    }
    const tileset = await loadTileset(
      files,
      theme,
      joinPath(dirOf(file), entry.source),
      entry.firstgid,
      `${file} › tilesets[${index}]`,
      issues,
    );
    if (tileset) tilesets.push(tileset);
  }
  if (issues.hasErrors) return done();
  tilesets.sort((a, b) => b.firstgid - a.firstgid);
  const resolve = (gid: number) => {
    const tileset = tilesets.find((t) => gid >= t.firstgid);
    if (!tileset || gid - tileset.firstgid >= tileset.tilecount) return undefined;
    return { tileset, localId: gid - tileset.firstgid };
  };

  // 4. Layers.
  const tileTypes: TileType[] = [{ flags: 0 }];
  const typeIndex = new Map<string, number>();
  const layers: TileLayer[] = [];
  const objects: MapObject[] = [];
  const spawns: SpawnArea[] = [];
  const classes = Object.keys(LAYER_CLASSES);

  for (const layer of tiled.layers) {
    const at = `layer "${layer.name}"`;
    if (layer.type === 'imagelayer' || layer.type === 'group') {
      issues.error(
        file,
        at,
        `${layer.type === 'group' ? 'Group layers' : 'Image layers'} are not supported. Use tile layers and object layers with a class: ${listOf(classes)}.`,
      );
      continue;
    }
    const role = layer.class as LayerClass;
    if (!classes.includes(role)) {
      issues.error(
        file,
        at,
        layer.class === ''
          ? `The layer has no class. Set its class to one of ${listOf(classes)} (Layer Properties › Class).`
          : `Unknown layer class "${layer.class}". Layer classes: ${listOf(classes)}.`,
      );
      continue;
    }
    const wrongKind = (expected: string) =>
      issues.error(file, at, `A layer of class "${role}" must be ${expected}.`);
    if (layer.type === 'tilelayer') {
      if (role !== 'ground' && role !== 'overhead') {
        wrongKind('an object layer');
        continue;
      }
      if (!Array.isArray(layer.data)) {
        issues.error(
          file,
          at,
          'Tile data must be saved as CSV: set Map Properties › Tile Layer Format to "CSV".',
        );
        continue;
      }
      if (
        layer.width !== tiled.width ||
        layer.height !== tiled.height ||
        layer.data.length !== tiled.width * tiled.height
      ) {
        issues.error(
          file,
          at,
          `The layer must have the map's size (${tiled.width}×${tiled.height} tiles).`,
        );
        continue;
      }
      const cells: number[] = [];
      let firstProblem: string | undefined;
      let problems = 0;
      layer.data.forEach((gid, i) => {
        const tx = i % tiled.width;
        const ty = Math.floor(i / tiled.width);
        const problem = (message: string) => {
          problems++;
          firstProblem ??= `tile (${tx}, ${ty}): ${message}`;
          cells.push(0);
        };
        if (gid === 0) return void cells.push(0);
        if (gid & FLIP_FLAGS) return problem('flipped or rotated tiles are not supported.');
        const found = resolve(gid);
        if (!found) return problem(`unknown tile ${gid}.`);
        const { tileset, localId } = found;
        if (tileset.tileWidth !== TILE_SIZE || tileset.tileHeight !== TILE_SIZE)
          return problem(
            `tiles of ${tileset.file} are ${tileset.tileWidth}×${tileset.tileHeight} px; tile layers use ${TILE_SIZE}×${TILE_SIZE} px tiles. Place larger pictures as tile objects in an "objects" layer.`,
          );
        if (role === 'ground' && (tileset.tiles.get(localId)?.flags ?? 0) & TileFlag.cover)
          return problem(
            `tile ${localId} of ${tileset.file} is cover, which works on tile objects only: place it in an "objects" layer.`,
          );
        const key = `${tileset.file}:${localId}`;
        let index = typeIndex.get(key);
        if (index === undefined) {
          index = tileTypes.length;
          typeIndex.set(key, index);
          tileTypes.push({
            // Only ground layers count for collision (the grid ignores overhead layers).
            flags: tileset.tiles.get(localId)?.flags ?? 0,
            visual: visualOf(tileset, localId),
          });
        }
        cells.push(index);
      });
      if (firstProblem)
        issues.error(
          file,
          at,
          problems > 1 ? `${firstProblem} (and ${problems - 1} more tiles)` : firstProblem,
        );
      layers.push({ name: layer.name, role, cells });
      continue;
    }

    if (layer.type !== 'objectgroup') continue;
    if (role !== 'objects' && role !== 'gameplay') {
      wrongKind('a tile layer');
      continue;
    }
    for (const object of layer.objects) {
      const objectAt = `${at} › object ${object.id} at ${where(object.x, object.y)}`;
      const objectClass = object.class ?? object.type;
      if (role === 'objects') {
        const found = object.gid === undefined ? undefined : resolve(object.gid & ~FLIP_FLAGS);
        if (object.gid === undefined) {
          issues.error(
            file,
            objectAt,
            'An "objects" layer holds tile objects only (Insert Tile). Put spawn areas in a "gameplay" layer.',
          );
          continue;
        }
        if (!found) {
          issues.error(file, objectAt, `Unknown tile ${object.gid}.`);
          continue;
        }
        const { tileset, localId } = found;
        if (object.gid & FLIP_FLAGS || object.rotation !== 0) {
          issues.error(file, objectAt, 'Flipped or rotated tile objects are not supported.');
          continue;
        }
        if (object.width !== tileset.tileWidth || object.height !== tileset.tileHeight) {
          issues.error(
            file,
            objectAt,
            `The object is resized to ${object.width}×${object.height} px; tile objects keep their tile's size (${tileset.tileWidth}×${tileset.tileHeight} px).`,
          );
          continue;
        }
        const tile = tileset.tiles.get(localId);
        const { values, set } = readProperties(
          object.properties,
          TILE_PROPERTIES,
          file,
          objectAt,
          issues,
        );
        // Object properties override the tile's; unset ones keep the tile's value.
        let flags = tile?.flags ?? 0;
        for (const [name, flag] of Object.entries(TILE_FLAG_PROPERTIES)) {
          if (!set.has(name)) continue;
          flags = values[name as keyof typeof TILE_FLAG_PROPERTIES] ? flags | flag : flags & ~flag;
        }
        const low = set.has('low') ? values.low : (tile?.low ?? false);
        const bulletPassPercent = set.has('bulletPassPercent')
          ? passPercent(values.bulletPassPercent, file, objectAt, issues)
          : (tile?.bulletPassPercent ?? 0);
        const left = object.x;
        const top = object.y - object.height;
        const shapes = tile?.footprints ?? [];
        if (flags !== 0 && shapes.length === 0)
          issues.warning(
            file,
            objectAt,
            `The tile is ${flagNames(flags).join(' and ')} but has no collision shape, so it blocks nothing. Draw its shapes in the tileset's collision editor.`,
          );
        objects.push({
          id: object.id,
          x: left + object.width / 2,
          y: object.y,
          visual: visualOf(tileset, localId),
          ...(low ? { low } : {}),
          footprints:
            flags === 0
              ? []
              : shapes.map((s) => ({
                  x: left + s.x,
                  y: top + s.y,
                  width: s.width,
                  height: s.height,
                  flags,
                  object: object.id,
                  ...(flags & TileFlag.cover ? { bulletPassPercent } : {}),
                })),
        });
        continue;
      }

      // Gameplay layer.
      if (!(objectClass in GAMEPLAY_OBJECT_CLASSES)) {
        issues.error(
          file,
          objectAt,
          objectClass === ''
            ? `The object has no class. Gameplay objects: ${listOf(Object.keys(GAMEPLAY_OBJECT_CLASSES))}.`
            : `Unknown gameplay object class "${objectClass}". Gameplay objects: ${listOf(Object.keys(GAMEPLAY_OBJECT_CLASSES))}.`,
        );
        continue;
      }
      const shape = notARectangle(object) ?? (object.rotation !== 0 ? 'rotated' : undefined);
      if (shape || object.gid !== undefined) {
        issues.error(
          file,
          objectAt,
          `A spawn area is a rectangle without rotation (Q52); this one is ${shape ?? 'a tile'}.`,
        );
        continue;
      }
      const { values } = readProperties(
        object.properties,
        SPAWN_PROPERTIES,
        file,
        objectAt,
        issues,
      );
      if (values.team < 1) {
        issues.error(file, objectAt, `Property "team" must be 1 or more, got ${values.team}.`);
        continue;
      }
      spawns.push({
        team: values.team,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
      });
    }
  }

  const id = ref.split('/').pop() ?? ref;
  return done({
    id,
    nameKey,
    width: tiled.width,
    height: tiled.height,
    tileTypes,
    layers,
    objects,
    spawns,
  });
}
