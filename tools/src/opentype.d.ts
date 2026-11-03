// Minimal types for opentype.js 2 (it ships none): only what the tools use.
declare module 'opentype.js' {
  export interface PathCommand {
    readonly type: 'M' | 'L' | 'Q' | 'C' | 'Z';
    readonly x?: number;
    readonly y?: number;
  }
  export interface Glyph {
    readonly index: number;
    readonly advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): { readonly commands: readonly PathCommand[] };
  }
  export interface Font {
    readonly unitsPerEm: number;
    readonly tables: {
      readonly cmap: { readonly glyphIndexMap: Readonly<Record<string, number>> };
    };
    /** 0 when the font has no glyph for the character. */
    charToGlyphIndex(char: string): number;
    charToGlyph(char: string): Glyph;
    getEnglishName(name: string): string | undefined;
  }
  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
