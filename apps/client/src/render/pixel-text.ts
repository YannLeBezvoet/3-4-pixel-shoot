// Text drawn with the HUD bitmap font (decision 0014): one sprite per character, white glyphs
// tinted to a palette color, so every pixel stays in palette at any integer scale.
import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import fontData from '../assets/fonts/hud-font.json';
import fontUrl from '../assets/fonts/hud-font.png';

/** Palette colors used by the HUD (Resurrect 64). */
export const HUD_COLORS = {
  text: 0xffffff,
  shadow: 0x2e222f,
  muted: 0x9babb2,
  accent: 0xf9c22b,
  health: 0x1ebc73,
  danger: 0xe83b3b,
  panel: 0x3e3546,
} as const;

export class PixelFont {
  readonly cell: number;
  readonly #glyphs = new Map<string, Texture>();

  constructor(texture: Texture) {
    this.cell = fontData.cell;
    [...fontData.chars].forEach((char, i) => {
      const x = (i % fontData.columns) * fontData.cell;
      const y = Math.floor(i / fontData.columns) * fontData.cell;
      this.#glyphs.set(
        char,
        new Texture({
          source: texture.source,
          frame: new Rectangle(x, y, fontData.cell, fontData.cell),
        }),
      );
    });
  }

  /** The glyph of a character; "?" when the font has none; undefined for spaces. */
  glyph(char: string): Texture | undefined {
    if (/\s/.test(char)) return undefined;
    return this.#glyphs.get(char) ?? this.#glyphs.get('?');
  }
}

export async function loadPixelFont(): Promise<PixelFont> {
  const texture = await Assets.load<Texture>(fontUrl);
  texture.source.scaleMode = 'nearest';
  return new PixelFont(texture);
}

export interface PixelTextOptions {
  readonly color?: number;
  /** A one-pixel shadow down and right, for reading over any ground. */
  readonly shadow?: boolean;
  /** Horizontal anchor: 0 left, 0.5 center, 1 right. */
  readonly anchorX?: number;
}

export class PixelText extends Container {
  readonly #font: PixelFont;
  readonly #front = new Container();
  readonly #back = new Container();
  readonly #anchorX: number;
  #text = '';
  #color: number;

  constructor(font: PixelFont, options: PixelTextOptions = {}) {
    super();
    this.#font = font;
    this.#color = options.color ?? HUD_COLORS.text;
    this.#anchorX = options.anchorX ?? 0;
    this.#back.position.set(1, 1);
    this.#back.visible = options.shadow ?? true;
    this.addChild(this.#back, this.#front);
  }

  get text(): string {
    return this.#text;
  }

  set text(value: string) {
    if (value === this.#text) return;
    this.#text = value;
    for (const layer of [this.#front, this.#back]) {
      layer.removeChildren().forEach((child) => child.destroy());
      [...value].forEach((char, i) => {
        const glyph = this.#font.glyph(char);
        if (!glyph) return;
        const sprite = new Sprite(glyph);
        sprite.x = i * this.#font.cell;
        sprite.tint = layer === this.#front ? this.#color : HUD_COLORS.shadow;
        layer.addChild(sprite);
      });
    }
    const width = [...value].length * this.#font.cell;
    this.#front.x = -Math.round(width * this.#anchorX);
    this.#back.x = this.#front.x + 1;
  }

  set color(value: number) {
    if (value === this.#color) return;
    this.#color = value;
    for (const child of this.#front.children) (child as Sprite).tint = value;
  }
}
