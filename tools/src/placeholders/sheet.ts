// Builds sprite sheets in Aseprite's JSON export format ("array" variant), so placeholders
// go through exactly the same loading code as real art.
import { PNG } from 'pngjs';
import type { Canvas } from './canvas';

export interface SliceSpec {
  readonly name: string;
  /** Point per frame; frames without an entry keep the previous point. */
  readonly points: ReadonlyMap<number, { x: number; y: number }>;
}

export interface SheetOutput {
  readonly png: Buffer;
  readonly json: string;
}

interface FrameSpec {
  readonly canvas: Canvas;
  readonly durationMs: number;
}

export class SheetBuilder {
  readonly #frames: FrameSpec[] = [];
  readonly #tags: { name: string; from: number; to: number; repeat?: number }[] = [];
  readonly #slicePoints = new Map<string, Map<number, { x: number; y: number }>>();

  readonly name: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;

  constructor(name: string, frameWidth: number, frameHeight: number, columns = 10) {
    this.name = name;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.columns = columns;
  }

  /** Adds frames as one tagged animation. `slices` gives slice points for each frame. */
  addAnimation(
    tag: string,
    frames: readonly {
      canvas: Canvas;
      durationMs: number;
      slices?: Record<string, { x: number; y: number }>;
    }[],
    { repeat }: { repeat?: number } = {},
  ): void {
    const from = this.#frames.length;
    for (const frame of frames) {
      const index = this.#frames.length;
      this.#frames.push({ canvas: frame.canvas, durationMs: frame.durationMs });
      for (const [name, point] of Object.entries(frame.slices ?? {})) {
        const points = this.#slicePoints.get(name) ?? new Map();
        points.set(index, point);
        this.#slicePoints.set(name, points);
      }
    }
    this.#tags.push({
      name: tag,
      from,
      to: this.#frames.length - 1,
      ...(repeat ? { repeat } : {}),
    });
  }

  build(): SheetOutput {
    const count = this.#frames.length;
    const columns = Math.min(this.columns, count);
    const rows = Math.ceil(count / columns);
    const png = new PNG({ width: columns * this.frameWidth, height: rows * this.frameHeight });
    png.data.fill(0);
    const frames = this.#frames.map((frame, index) => {
      const x = (index % columns) * this.frameWidth;
      const y = Math.floor(index / columns) * this.frameHeight;
      for (let j = 0; j < this.frameHeight; j++) {
        const row = frame.canvas.data.subarray(
          j * this.frameWidth * 4,
          (j + 1) * this.frameWidth * 4,
        );
        png.data.set(row, ((y + j) * png.width + x) * 4);
      }
      return {
        filename: `${this.name} ${index}.aseprite`,
        frame: { x, y, w: this.frameWidth, h: this.frameHeight },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: this.frameWidth, h: this.frameHeight },
        sourceSize: { w: this.frameWidth, h: this.frameHeight },
        duration: frame.durationMs,
      };
    });
    const slices = [...this.#slicePoints].map(([name, points]) => {
      let previous: string | undefined;
      const keys = [];
      for (const [frame, point] of [...points].sort((a, b) => a[0] - b[0])) {
        const signature = `${point.x},${point.y}`;
        if (signature === previous) continue;
        previous = signature;
        keys.push({ frame, bounds: { x: point.x, y: point.y, w: 1, h: 1 }, pivot: { x: 0, y: 0 } });
      }
      return { name, color: '#0000ffff', keys };
    });
    const json = {
      frames,
      meta: {
        app: 'pixel-shoot placeholder generator (tools/src/placeholders)',
        version: '1',
        image: `${this.name}.png`,
        format: 'RGBA8888',
        size: { w: png.width, h: png.height },
        scale: '1',
        frameTags: this.#tags.map((t) => ({
          name: t.name,
          from: t.from,
          to: t.to,
          direction: 'forward',
          color: '#000000ff',
          ...(t.repeat ? { repeat: String(t.repeat) } : {}),
        })),
        layers: [{ name: 'placeholder', opacity: 255, blendMode: 'normal' }],
        slices,
      },
    };
    return {
      png: PNG.sync.write(png, { colorType: 6 }),
      json: `${JSON.stringify(json, null, 1)}\n`,
    };
  }
}

/** A single image without sprite sheet data (tilesets, large props). */
export function imageOnly(canvas: Canvas): Buffer {
  const png = new PNG({ width: canvas.width, height: canvas.height });
  png.data.set(canvas.data);
  return PNG.sync.write(png, { colorType: 6 });
}
