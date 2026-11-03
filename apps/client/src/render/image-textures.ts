// Textures cut from whole images (tilesets), cached by image and rectangle. A reloaded image is
// a new ImageBitmap and gets new textures.
import { ImageSource, Rectangle, Texture } from 'pixi.js';
import type { TileVisual } from '@pixel-shoot/sim';

export class ImageTextures {
  readonly #sources = new Map<ImageBitmap, ImageSource>();
  readonly #textures = new Map<string, Texture>();
  readonly #ids = new Map<ImageBitmap, number>();

  texture(image: ImageBitmap, visual: TileVisual): Texture {
    let source = this.#sources.get(image);
    if (!source) {
      source = new ImageSource({ resource: image, scaleMode: 'nearest' });
      this.#sources.set(image, source);
      this.#ids.set(image, this.#ids.size);
    }
    const key = `${this.#ids.get(image)}:${visual.x},${visual.y},${visual.width},${visual.height}`;
    let texture = this.#textures.get(key);
    if (!texture) {
      texture = new Texture({
        source,
        frame: new Rectangle(visual.x, visual.y, visual.width, visual.height),
      });
      this.#textures.set(key, texture);
    }
    return texture;
  }

  destroy(): void {
    for (const source of this.#sources.values()) source.destroy();
    this.#sources.clear();
    this.#textures.clear();
    this.#ids.clear();
  }
}
