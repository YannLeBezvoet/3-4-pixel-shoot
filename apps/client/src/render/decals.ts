// What stays on the ground until the end of the round (Q32): stamps painted once into textures
// of the size of the map chunks, so that a thousand stains cost no more to draw than one. They
// sit above the tile chunks rather than inside them: a tile that changes does not wash them away.
import type { Renderer, Texture } from 'pixi.js';
import { Container, RenderTexture, Sprite } from 'pixi.js';

/** Side of a decal texture, in world pixels: 16 tiles, as map chunks. */
const CHUNK_PIXELS = 768;

interface DecalChunk {
  readonly sprite: Sprite;
  readonly texture: RenderTexture;
}

export class DecalLayer {
  readonly root = new Container();
  readonly #renderer: Renderer;
  readonly #chunks = new Map<string, DecalChunk>();
  readonly #stamp = new Sprite();
  readonly #stage = new Container();

  constructor(renderer: Renderer) {
    this.#renderer = renderer;
    this.#stage.addChild(this.#stamp);
  }

  #chunk(cx: number, cy: number): DecalChunk {
    const key = `${cx}:${cy}`;
    let chunk = this.#chunks.get(key);
    if (!chunk) {
      const texture = RenderTexture.create({
        width: CHUNK_PIXELS,
        height: CHUNK_PIXELS,
        scaleMode: 'nearest',
      });
      const sprite = new Sprite(texture);
      sprite.position.set(cx * CHUNK_PIXELS, cy * CHUNK_PIXELS);
      this.root.addChild(sprite);
      chunk = { sprite, texture };
      this.#chunks.set(key, chunk);
      // A new texture holds whatever memory it was given.
      this.#renderer.render({ container: new Container(), target: texture, clear: true });
    }
    return chunk;
  }

  /** Paints a picture on the ground, with its anchor at a world point. */
  stamp(texture: Texture, x: number, y: number, anchorX: number, anchorY: number): void {
    const left = Math.round(x - anchorX * texture.width);
    const top = Math.round(y - anchorY * texture.height);
    const cx0 = Math.floor(left / CHUNK_PIXELS);
    const cy0 = Math.floor(top / CHUNK_PIXELS);
    const cx1 = Math.floor((left + texture.width - 1) / CHUNK_PIXELS);
    const cy1 = Math.floor((top + texture.height - 1) / CHUNK_PIXELS);
    this.#stamp.texture = texture;
    // A picture across a chunk border is painted in each chunk it touches.
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++) {
        this.#stamp.position.set(left - cx * CHUNK_PIXELS, top - cy * CHUNK_PIXELS);
        this.#renderer.render({
          container: this.#stage,
          target: this.#chunk(cx, cy).texture,
          clear: false,
        });
      }
  }

  /** Shows only the chunks that touch the visible rectangle (world pixels). */
  cull(left: number, top: number, width: number, height: number): void {
    for (const { sprite } of this.#chunks.values())
      sprite.visible =
        sprite.x < left + width &&
        sprite.x + CHUNK_PIXELS > left &&
        sprite.y < top + height &&
        sprite.y + CHUNK_PIXELS > top;
  }

  /** Washes the ground: a new round. */
  clear(): void {
    for (const { sprite, texture } of this.#chunks.values()) {
      sprite.destroy();
      texture.destroy(true);
    }
    this.#chunks.clear();
  }

  destroy(): void {
    this.clear();
    this.#stage.destroy({ children: true });
    this.root.destroy();
  }
}
