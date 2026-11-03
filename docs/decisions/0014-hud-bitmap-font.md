# 0014. HUD bitmap font generated from the interface font

- Status: Accepted (2026-11-03, within the approved plan of milestone 1)
- Date: 2026-11-03

## Context

Decision [0004](0004-ui.md) draws the in-match HUD with PixiJS using a bitmap pixel font whose pixels are palette colors. The interface font, Press Start 2P (OFL 1.1, Reserved Font Name "Press Start 2P"), already covers the languages of the game. Text must stay pixel-exact at every integer scale and in palette, and every translated text must be drawable.

## Options considered

- **PixiJS dynamic bitmap font (`BitmapFont.install`) from the TTF.** No file to maintain, but glyphs are rasterized by the browser with anti-aliasing: off-palette edge pixels, and results that differ between browsers.
- **A hand-drawn bitmap font.** Full control, but a second font to design and keep in sync with the languages.
- **A 1-bit atlas generated from the interface font by a tool.** Press Start 2P is drawn on an 8-pixel grid with straight outlines, so rasterizing it at 8 px is exact; the HUD then matches the menus.

## Decision

- `npm run assets:font` (`tools/src/hud-font/`) rasterizes every glyph of the interface font at 8 px, one bit per pixel (pixel centers tested against the outlines), into `apps/client/src/assets/fonts/hud-font.png` (white on transparent, 32 glyphs per row) and `hud-font.json` (the characters in atlas order).
- The client draws one sprite per character, tinted to a palette color (`render/pixel-text.ts`), with an optional one-pixel shadow; banners use a scale of 2.
- `check:i18n` fails when the atlas is out of date or when a text uses a character it lacks.
- The generated font is a Modified Version under the OFL: it keeps the license and copyright notice and is named "Pixel Shoot HUD", since the OFL reserves the name "Press Start 2P".

## Consequences

- One font file is the source of both the menus and the HUD; changing it means running `npm run assets:font`.
- The HUD font has one size (8 px, or 16 px scaled); larger sizes are integer scales.
- A language with another script (Cyrillic, Greek, CJK) needs a font covering it, as already noted in [add a language](../guides/add-a-language.md); the generator works for any font drawn on a pixel grid with straight outlines and refuses curved outlines.
