// The parts of Tiled's JSON formats (.tmj maps, .tsj tilesets) that the game reads. Tiled
// writes many more fields; they are ignored. https://doc.mapeditor.org/en/stable/reference/json-map-format/
import { z } from 'zod';

export const tiledProperty = z.object({
  name: z.string(),
  type: z.string().default('string'),
  value: z.unknown(),
});

const properties = z.array(tiledProperty).default([]);

export const tiledObject = z.object({
  id: z.int(),
  name: z.string().default(''),
  /** The object's class. Tiled 1.9 wrote it as "class", other versions as "type". */
  type: z.string().default(''),
  class: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().default(0),
  height: z.number().default(0),
  rotation: z.number().default(0),
  gid: z.int().nonnegative().optional(),
  ellipse: z.boolean().optional(),
  point: z.boolean().optional(),
  polygon: z.array(z.unknown()).optional(),
  polyline: z.array(z.unknown()).optional(),
  text: z.unknown().optional(),
  properties,
});

const layerBase = {
  id: z.int(),
  name: z.string(),
  class: z.string().default(''),
};

export const tiledTileLayer = z.object({
  ...layerBase,
  type: z.literal('tilelayer'),
  width: z.int(),
  height: z.int(),
  data: z.union([z.array(z.number()), z.string()]).optional(),
  encoding: z.string().optional(),
  chunks: z.array(z.unknown()).optional(),
});

export const tiledObjectLayer = z.object({
  ...layerBase,
  type: z.literal('objectgroup'),
  objects: z.array(tiledObject).default([]),
});

const tiledOtherLayer = z.object({
  ...layerBase,
  type: z.enum(['imagelayer', 'group']),
});

export const tiledMap = z.object({
  orientation: z.string(),
  infinite: z.boolean().default(false),
  width: z.int().positive(),
  height: z.int().positive(),
  tilewidth: z.int().positive(),
  tileheight: z.int().positive(),
  properties,
  tilesets: z.array(
    z.object({ firstgid: z.int().positive(), source: z.string().optional() }).loose(),
  ),
  layers: z.array(
    z.discriminatedUnion('type', [tiledTileLayer, tiledObjectLayer, tiledOtherLayer]),
  ),
});

export const tiledTileset = z.object({
  tilewidth: z.int().positive(),
  tileheight: z.int().positive(),
  tilecount: z.int().nonnegative(),
  columns: z.int().nonnegative(),
  image: z.string().optional(),
  margin: z.int().nonnegative().default(0),
  spacing: z.int().nonnegative().default(0),
  tiles: z
    .array(
      z.object({
        id: z.int().nonnegative(),
        image: z.string().optional(),
        properties,
        objectgroup: z.object({ objects: z.array(tiledObject).default([]) }).optional(),
      }),
    )
    .default([]),
});

export type TiledProperty = z.infer<typeof tiledProperty>;
export type TiledObject = z.infer<typeof tiledObject>;
export type TiledMap = z.infer<typeof tiledMap>;
export type TiledTileset = z.infer<typeof tiledTileset>;
export type TiledTileLayer = z.infer<typeof tiledTileLayer>;
export type TiledObjectLayer = z.infer<typeof tiledObjectLayer>;
