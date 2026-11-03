// Turns loaded sprite sheets into PixiJS textures. A reloaded sheet comes with a new image,
// which gets new textures; the old ones are destroyed.
import { ImageSource, Rectangle, Texture } from 'pixi.js';
import type { LoadedSheet } from '../content/content-store';

interface Entry {
  readonly image: ImageBitmap;
  readonly source: ImageSource;
  readonly frames: Texture[];
}

export class SheetTextures {
  readonly #entries = new Map<string, Entry>();

  /** Texture of one frame. `key` identifies the sheet across reloads (theme id + ref). */
  frame(key: string, loaded: LoadedSheet, index: number): Texture {
    let entry = this.#entries.get(key);
    if (!entry || entry.image !== loaded.image) {
      if (entry) entry.source.destroy();
      const source = new ImageSource({ resource: loaded.image, scaleMode: 'nearest' });
      const frames = loaded.sheet.frames.map(
        (f) => new Texture({ source, frame: new Rectangle(f.x, f.y, f.w, f.h) }),
      );
      entry = { image: loaded.image, source, frames };
      this.#entries.set(key, entry);
    }
    return entry.frames[index] ?? Texture.EMPTY;
  }

  destroy(): void {
    for (const entry of this.#entries.values()) entry.source.destroy();
    this.#entries.clear();
  }
}
