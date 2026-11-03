// npm run assets:font     → writes the HUD bitmap font from the interface font (decision 0014)
// check:i18n verifies that it is up to date and covers every text.
import { readFile, writeFile } from 'node:fs/promises';
import { UI_FONT } from '../check-i18n/cli';
import { fromRoot } from '../paths';
import { HUD_FONT_JSON, HUD_FONT_PNG, buildHudFont, parseFont } from './hud-font';

export async function renderHudFont() {
  return buildHudFont(parseFont(await readFile(fromRoot(UI_FONT))));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { png, json } = await renderHudFont();
  await writeFile(fromRoot(HUD_FONT_PNG), png);
  await writeFile(fromRoot(HUD_FONT_JSON), json);
  console.log(`wrote ${HUD_FONT_PNG} and ${HUD_FONT_JSON}`);
}
