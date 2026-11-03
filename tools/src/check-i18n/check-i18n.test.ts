import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { formatIssues } from '@pixel-shoot/content';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HUD_FONT_JSON, HUD_FONT_PNG } from '../hud-font/hud-font';
import { fromRoot } from '../paths';
import { UI_FONT, checkI18n } from './cli';

describe('checkI18n', () => {
  let root = '';
  const write = async (file: string, json: unknown) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), JSON.stringify(json));
  };
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pixel-shoot-i18n-'));
    await mkdir(path.join(root, path.dirname(UI_FONT)), { recursive: true });
    for (const file of [UI_FONT, HUD_FONT_PNG, HUD_FONT_JSON])
      await writeFile(
        path.join(root, file),
        await import('node:fs/promises').then((fs) => fs.readFile(fromRoot(file))),
      );
    await write('locales/en.json', {
      _meta: { name: 'English' },
      menu: { play: 'Play', kills: '{{count}} kills', kills_one: '{{count}} kill' },
    });
  });
  afterEach(async () => rm(root, { recursive: true, force: true }));

  it('accepts complete translations, plural forms included', async () => {
    await write('locales/fr.json', {
      _meta: { name: 'Français' },
      menu: {
        play: 'Jouer',
        kills_one: '{{count}} élimination',
        kills_many: '{{count}} éliminations',
        kills_other: '{{count}} éliminations',
      },
    });
    expect(formatIssues((await checkI18n(root)).issues)).toBe('');
  });

  it('reports missing keys, wrong variables and a missing language name', async () => {
    await write('locales/fr.json', {
      _meta: { name: 'Français' },
      menu: { kills: '{{n}} éliminations' },
    });
    await write('locales/de.json', { menu: { play: 'Spielen', kills: '{{count}} Abschüsse' } });
    const text = formatIssues((await checkI18n(root)).issues);
    expect(text).toContain(
      'error: locales/fr.json › menu.play\n  Missing translation (present in locales/en.json).',
    );
    expect(text).toContain(
      'error: locales/fr.json › menu.kills\n  Uses variables {{n}} but English uses {{count}}.',
    );
    expect(text).toContain('error: locales/de.json › _meta\n  Missing "_meta": { "name": "…" }');
  });

  it('reports characters the font cannot draw, in interface and theme texts', async () => {
    await write('locales/ja.json', {
      _meta: { name: '日本語' },
      menu: { play: 'プレイ', kills: '{{count}}' },
    });
    await write('themes/t/locales/en.json', { weapon: { name: 'Ωmega' } });
    const text = formatIssues((await checkI18n(root)).issues);
    expect(text).toContain(
      'error: locales/ja.json › _meta.name\n  The font "Press Start 2P" has no glyph for "日" (U+65E5)',
    );
    expect(text).toContain('error: locales/ja.json › menu.play');
    expect(text).not.toContain('Ωmega');
  });

  it('reports a HUD font that is missing or out of date', async () => {
    await writeFile(path.join(root, HUD_FONT_JSON), '{}');
    const issues = await checkI18n(root);
    expect(formatIssues(issues.issues)).toContain(
      'The HUD font is missing or out of date: run "npm run assets:font".',
    );
  });
});
