// npm run check:i18n
// - every interface language has the same keys as English, with the same {{variables}};
// - every character used by any translation (interface and themes) exists in the game font
//   and in the HUD bitmap font, which must be up to date (npm run assets:font).
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Locale } from '@pixel-shoot/content';
import { IssueCollector, compareLocales, formatIssues, parseLocale } from '@pixel-shoot/content';
import opentype from 'opentype.js';
import { HUD_FONT_JSON, HUD_FONT_PNG, buildHudFont } from '../hud-font/hud-font';
import type { HudFontData } from '../hud-font/hud-font';
import { repoRoot } from '../paths';

/** The interface font (also referenced by apps/client/src/style.css). */
export const UI_FONT = 'apps/client/src/assets/fonts/PressStart2P-Regular.ttf';
const REFERENCE = 'en';

async function jsonFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

async function readLocale(
  root: string,
  file: string,
  issues: IssueCollector,
  requireMeta: boolean,
): Promise<Locale | undefined> {
  let json: unknown;
  try {
    json = JSON.parse(await readFile(path.join(root, file), 'utf8'));
  } catch (error) {
    issues.error(file, '', `Invalid JSON: ${(error as Error).message}`);
    return undefined;
  }
  return parseLocale(json, file, issues, { requireMeta });
}

export async function checkI18n(root = repoRoot): Promise<IssueCollector> {
  const issues = new IssueCollector();
  const locales = new Map<string, Locale>();
  for (const name of await jsonFiles(path.join(root, 'locales'))) {
    const locale = await readLocale(root, `locales/${name}`, issues, true);
    if (locale) locales.set(name.slice(0, -'.json'.length), locale);
  }

  const reference = locales.get(REFERENCE);
  if (!reference)
    issues.error(
      `locales/${REFERENCE}.json`,
      '',
      'English is the fallback language: its file is required.',
    );
  for (const [code, locale] of locales) {
    if (!reference || code === REFERENCE) continue;
    const file = `locales/${code}.json`;
    const { missing, extra, variableMismatches } = compareLocales(reference, locale);
    for (const key of missing)
      issues.error(file, key, `Missing translation (present in locales/${REFERENCE}.json).`);
    for (const key of extra)
      issues.warning(file, key, `Not in locales/${REFERENCE}.json: unused or misspelled key.`);
    for (const { key, expected, actual } of variableMismatches) {
      const show = (vars: string[]) =>
        vars.length ? vars.map((v) => `{{${v}}}`).join(', ') : 'none';
      issues.error(file, key, `Uses variables ${show(actual)} but English uses ${show(expected)}.`);
    }
  }

  // Font coverage, for interface and theme texts.
  const texts: { file: string; key: string; text: string }[] = [];
  for (const [code, locale] of locales) {
    if (locale.meta)
      texts.push({ file: `locales/${code}.json`, key: '_meta.name', text: locale.meta.name });
    for (const [key, text] of locale.strings)
      texts.push({ file: `locales/${code}.json`, key, text });
  }
  for (const theme of await readdir(path.join(root, 'themes')).catch(() => [] as string[])) {
    for (const name of await jsonFiles(path.join(root, 'themes', theme, 'locales'))) {
      const file = `themes/${theme}/locales/${name}`;
      const locale = await readLocale(root, file, issues, false);
      for (const [key, text] of locale?.strings ?? []) texts.push({ file, key, text });
    }
  }
  const buffer = await readFile(path.join(root, UI_FONT));
  const font = opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
  const fontName = font.getEnglishName('fontFamily') || path.basename(UI_FONT);

  // The HUD font is generated from the interface font and must match it.
  const expected = buildHudFont(font);
  const [png, json] = await Promise.all([
    readFile(path.join(root, HUD_FONT_PNG)).catch(() => undefined),
    readFile(path.join(root, HUD_FONT_JSON), 'utf8').catch(() => undefined),
  ]);
  if (!png?.equals(expected.png) || json !== expected.json)
    issues.error(
      HUD_FONT_JSON,
      '',
      'The HUD font is missing or out of date: run "npm run assets:font".',
    );
  const hudChars = new Set(json ? (JSON.parse(json) as HudFontData).chars : '');
  for (const { file, key, text } of texts) {
    const missing = [...new Set([...text])].filter(
      (char) => !/\s/.test(char) && font.charToGlyphIndex(char) === 0,
    );
    const notInHud = [...new Set([...text])].filter(
      (char) => !/\s/.test(char) && !hudChars.has(char),
    );
    if (missing.length === 0 && notInHud.length > 0) {
      issues.error(
        file,
        key,
        `The HUD font has no glyph for ${notInHud.map((c) => `"${c}"`).join(', ')}: run "npm run assets:font".`,
      );
    }
    if (missing.length > 0) {
      issues.error(
        file,
        key,
        `The font "${fontName}" has no glyph for ${missing.map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`).join(', ')}. Use other characters or a font that covers this language (docs/guides/add-a-language.md).`,
      );
    }
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const issues = await checkI18n();
  if (issues.issues.length > 0) console.log(formatIssues(issues.issues));
  console.log(
    issues.hasErrors
      ? '✗ Translations have errors.'
      : '✓ Translations are complete and covered by the font.',
  );
  process.exitCode = issues.hasErrors ? 1 : 0;
}
