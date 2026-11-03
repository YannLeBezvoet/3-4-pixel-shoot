// A small RGBA drawing surface for generated placeholder art. Every color is checked
// against the palette when it is chosen, so generated art cannot leave the palette.
import type { Palette } from '@pixel-shoot/content';

export type Color = readonly [number, number, number];

export class ColorPicker {
  readonly #palette: Palette;

  constructor(palette: Palette) {
    this.#palette = palette;
  }

  /** A palette color by hex ("2e222f"); throws if the color is not in the palette. */
  hex(hex: string): Color {
    const value = Number.parseInt(hex, 16);
    const color: Color = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    if (!this.#palette.has(...color))
      throw new Error(`#${hex} is not a ${this.#palette.name} color.`);
    return color;
  }
}

export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, color: Color): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    this.data.set([color[0], color[1], color[2], 255], (py * this.width + px) * 4);
  }

  clear(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data.set([0, 0, 0, 0], (y * this.width + x) * 4);
  }

  isSet(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.data[(y * this.width + x) * 4 + 3] === 255;
  }

  rect(x: number, y: number, w: number, h: number, color: Color): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }

  /** Filled ellipse centered on (cx, cy); `filter` keeps only some pixels. */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: Color,
    filter?: (x: number, y: number) => boolean,
  ): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5);
        const dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1 && (!filter || filter(x, y))) this.set(x, y, color);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: Color): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++)
      this.set(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color);
  }

  /** Draws a 1-pixel outline around every set pixel (outside the shape). */
  outline(color: Color): void {
    const outside: [number, number][] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isSet(x, y)) continue;
        if (
          this.isSet(x - 1, y) ||
          this.isSet(x + 1, y) ||
          this.isSet(x, y - 1) ||
          this.isSet(x, y + 1)
        )
          outside.push([x, y]);
      }
    }
    for (const [x, y] of outside) this.set(x, y, color);
  }

  /** Copies another canvas at (dx, dy), optionally mirrored horizontally. */
  blit(source: Canvas, dx: number, dy: number, { mirror = false } = {}): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const i = (y * source.width + x) * 4;
        if (source.data[i + 3] !== 255) continue;
        const tx = mirror ? source.width - 1 - x : x;
        this.set(dx + tx, dy + y, [
          source.data[i] as number,
          source.data[i + 1] as number,
          source.data[i + 2] as number,
        ]);
      }
    }
  }
}
