// A map drawn from MapData: ground and overhead tile layers in chunks of 16×16 tiles, each
// cached as one texture and hidden when off screen; map objects (trees, huts) as sprites the
// world layer sorts by depth, except low objects (sandbags), drawn just above the ground.
// A tile that changes during a round bakes its chunk again, once per frame at most.
import type { MapData, TileVisual } from '@pixel-shoot/sim';
import { TILE_SIZE } from '@pixel-shoot/sim';
import { Container, Sprite } from 'pixi.js';
import { depthOf } from './depth';
import type { ImageTextures } from './image-textures';

const CHUNK = 16;
const CHUNK_PIXELS = CHUNK * TILE_SIZE;

export interface MapView {
  /** Drawn below everything. */
  readonly ground: Container;
  /** Low objects (sandbags): drawn above the ground, below corpses and the world layer. */
  readonly low: Container;
  /** Drawn above everything. */
  readonly overhead: Container;
  /** Depth-sorted sprites to place in the world layer. */
  readonly objects: readonly Sprite[];
  /** Replaces a tile; `tile` indexes `MapData.tileTypes`. */
  setTile(layer: number, tileX: number, tileY: number, tile: number): void;
  /** Shows what is left of a destroyed object, flat on the ground, or nothing. */
  destroyObject(id: number, remains: TileVisual | undefined): void;
  /** Bakes the chunks changed since the last call. */
  flush(): void;
  /** Shows only the chunks that touch the visible rectangle (world pixels). */
  cull(left: number, top: number, width: number, height: number): void;
  destroy(): void;
}

interface Chunk {
  readonly container: Container;
  /** Tile sprites by index in the map. */
  readonly sprites: Map<number, Sprite>;
}

export function createMapView(
  map: MapData,
  images: ReadonlyMap<string, ImageBitmap>,
  textures: ImageTextures,
): MapView {
  const ground = new Container();
  const overhead = new Container();
  const chunks = new Map<string, Chunk>();
  const dirty = new Set<Chunk>();
  const chunkKey = (layer: number, cx: number, cy: number) => `${layer}:${cx}:${cy}`;

  const tileSprite = (type: number, x: number, y: number, cx: number, cy: number) => {
    const visual = map.tileTypes[type]?.visual;
    const image = visual && images.get(visual.image);
    if (!visual || !image) return undefined;
    const sprite = new Sprite(textures.texture(image, visual));
    sprite.position.set((x - cx) * TILE_SIZE, (y - cy) * TILE_SIZE);
    return sprite;
  };

  map.layers.forEach((layer, index) => {
    const target = layer.role === 'ground' ? ground : overhead;
    for (let cy = 0; cy < map.height; cy += CHUNK)
      for (let cx = 0; cx < map.width; cx += CHUNK) {
        const container = new Container();
        container.position.set(cx * TILE_SIZE, cy * TILE_SIZE);
        const sprites = new Map<number, Sprite>();
        for (let y = cy; y < Math.min(cy + CHUNK, map.height); y++)
          for (let x = cx; x < Math.min(cx + CHUNK, map.width); x++) {
            const cell = y * map.width + x;
            const sprite = tileSprite(layer.cells[cell] ?? 0, x, y, cx, cy);
            if (!sprite) continue;
            sprites.set(cell, sprite);
            container.addChild(sprite);
          }
        if (container.children.length === 0) {
          container.destroy();
          continue;
        }
        container.cacheAsTexture(true);
        target.addChild(container);
        chunks.set(chunkKey(index, cx, cy), { container, sprites });
      }
  });

  const low = new Container({ sortableChildren: true });
  const byId = new Map<number, Sprite>();
  const objects = map.objects.flatMap((object) => {
    const visual = object.visual;
    const image = visual && images.get(visual.image);
    if (!visual || !image) return [];
    const sprite = new Sprite(textures.texture(image, visual));
    sprite.anchor.set(0.5, 1);
    sprite.position.set(object.x, object.y);
    sprite.zIndex = depthOf(object.y, object.id);
    byId.set(object.id, sprite);
    if (!object.low) return [sprite];
    low.addChild(sprite);
    return [];
  });

  return {
    ground,
    low,
    overhead,
    objects,
    setTile(layer, tileX, tileY, tile) {
      const cx = tileX - (tileX % CHUNK);
      const cy = tileY - (tileY % CHUNK);
      // A chunk with no tile at all was never made: only tiles disappearing reach it here.
      const chunk = chunks.get(chunkKey(layer, cx, cy));
      if (!chunk) return;
      const cell = tileY * map.width + tileX;
      chunk.sprites.get(cell)?.destroy();
      chunk.sprites.delete(cell);
      const sprite = tileSprite(tile, tileX, tileY, cx, cy);
      if (sprite) {
        chunk.sprites.set(cell, sprite);
        chunk.container.addChild(sprite);
      }
      dirty.add(chunk);
    },
    destroyObject(id, remains) {
      const sprite = byId.get(id);
      if (!sprite) return;
      const image = remains && images.get(remains.image);
      if (remains && image) {
        sprite.texture = textures.texture(image, remains);
        low.addChild(sprite);
      } else sprite.visible = false;
    },
    flush() {
      for (const { container } of dirty) container.updateCacheTexture();
      dirty.clear();
    },
    cull(left, top, width, height) {
      for (const { container } of chunks.values())
        container.visible =
          container.x < left + width &&
          container.x + CHUNK_PIXELS > left &&
          container.y < top + height &&
          container.y + CHUNK_PIXELS > top;
    },
    destroy() {
      ground.destroy({ children: true });
      low.destroy({ children: true });
      overhead.destroy({ children: true });
      for (const sprite of objects) if (!sprite.destroyed) sprite.destroy();
    },
  };
}
