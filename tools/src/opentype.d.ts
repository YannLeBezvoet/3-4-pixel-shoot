// Minimal types for opentype.js 2 (it ships none): only what check-i18n uses.
declare module 'opentype.js' {
  export interface Font {
    /** 0 when the font has no glyph for the character. */
    charToGlyphIndex(char: string): number;
    getEnglishName(name: string): string | undefined;
  }
  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
