// A map drawn from MapData: ground and overhead tile layers in chunks of 16×16 tiles, each
// cached as one texture and hidden when off screen; map objects (trees, huts) as sprites the
// world layer sorts by depth.
import type { MapData } from '@pixel-shoot/sim';
import { TILE_SIZE } from '@pixel-shoot/sim';
import { Container, Sprite } from 'pixi.js';
import { depthOf } from './depth';
import type { ImageTextures } from './image-textures';

const CHUNK = 16;
const CHUNK_PIXELS = CHUNK * TILE_SIZE;

export interface MapView {
  /** Drawn below everything. */
  readonly ground: Container;
  /** Drawn above everything. */
  readonly overhead: Container;
  /** Depth-sorted sprites to place in the world layer. */
  readonly objects: readonly Sprite[];
  /** Shows only the chunks that touch the visible rectangle (world pixels). */
  cull(left: number, top: number, width: number, height: number): void;
  destroy(): void;
}

export function createMapView(
  map: MapData,
  images: ReadonlyMap<string, ImageBitmap>,
  textures: ImageTextures,
): MapView {
  const ground = new Container();
  const overhead = new Container();
  const chunks: Container[] = [];

  for (const layer of map.layers) {
    const target = layer.role === 'ground' ? ground : overhead;
    for (let cy = 0; cy < map.height; cy += CHUNK)
      for (let cx = 0; cx < map.width; cx += CHUNK) {
        const chunk = new Container();
        chunk.position.set(cx * TILE_SIZE, cy * TILE_SIZE);
        for (let y = cy; y < Math.min(cy + CHUNK, map.height); y++)
          for (let x = cx; x < Math.min(cx + CHUNK, map.width); x++) {
            const visual = map.tileTypes[layer.cells[y * map.width + x] ?? 0]?.visual;
            const image = visual && images.get(visual.image);
            if (!visual || !image) continue;
            const sprite = new Sprite(textures.texture(image, visual));
            sprite.position.set((x - cx) * TILE_SIZE, (y - cy) * TILE_SIZE);
            chunk.addChild(sprite);
          }
        if (chunk.children.length === 0) {
          chunk.destroy();
          continue;
        }
        chunk.cacheAsTexture(true);
        target.addChild(chunk);
        chunks.push(chunk);
      }
  }

  const objects = map.objects.flatMap((object) => {
    const visual = object.visual;
    const image = visual && images.get(visual.image);
    if (!visual || !image) return [];
    const sprite = new Sprite(textures.texture(image, visual));
    sprite.anchor.set(0.5, 1);
    sprite.position.set(object.x, object.y);
    sprite.zIndex = depthOf(object.y, object.id);
    return [sprite];
  });

  return {
    ground,
    overhead,
    objects,
    cull(left, top, width, height) {
      for (const chunk of chunks)
        chunk.visible =
          chunk.x < left + width &&
          chunk.x + CHUNK_PIXELS > left &&
          chunk.y < top + height &&
          chunk.y + CHUNK_PIXELS > top;
    },
    destroy() {
      ground.destroy({ children: true });
      overhead.destroy({ children: true });
      for (const sprite of objects) sprite.destroy();
    },
  };
}
