// Loads a theme folder and validates it completely: schemas, behavior parameters,
// cross-references, sprites and translations. Every problem is collected.
import type { BehaviorRegistry } from '@pixel-shoot/sim';
import type { FileProvider } from '../files/file-provider';
import { joinPath } from '../files/file-provider';
import { readJson } from '../files/read-json';
import type { ContentIssue } from '../issues/issues';
import { IssueCollector, describeJsonPath } from '../issues/issues';
import { validate } from '../issues/zod';
import type { Locale } from '../locales/locale';
import { hasKey, parseLocale } from '../locales/locale';
import type { SpriteRequirements } from '../sprites/conventions';
import { CHARACTER_SPRITE, WEAPON_SPRITE } from '../sprites/conventions';
import type { SpriteSheet } from '../sprites/sprite-sheet';
import { checkSpriteRequirements, parseSpriteSheet } from '../sprites/sprite-sheet';
import type { CharacterDefinition, ThemeManifest } from './schemas';
import {
  THEME_FORMAT_VERSION,
  charactersFileSchema,
  themeManifestSchema,
  weaponsFileSchema,
} from './schemas';

export interface ThemeWeapon {
  readonly id: string;
  readonly nameKey: string;
  readonly behavior: string;
  /** Parameters validated by the behavior's schema, defaults applied. */
  readonly params: unknown;
  readonly sprite: string;
  readonly sounds: Readonly<Record<string, string>>;
}

export type ThemeCharacter = CharacterDefinition;

export interface Theme {
  readonly id: string;
  /** Folder of the theme relative to the content root, e.g. "themes/vietnam". */
  readonly dir: string;
  readonly nameKey: string;
  readonly defaultLanguage: string;
  readonly factions: ThemeManifest['factions'];
  readonly characters: ReadonlyMap<string, ThemeCharacter>;
  readonly weapons: ReadonlyMap<string, ThemeWeapon>;
  /** Sprite sheets by asset path (relative to the theme folder, without extension). */
  readonly sprites: ReadonlyMap<string, SpriteSheet>;
  /** Theme texts by language. */
  readonly translations: ReadonlyMap<string, Locale>;
}

export interface LoadThemeOptions {
  readonly behaviors: BehaviorRegistry;
  /** Languages of the game interface; the theme should translate its texts into each. */
  readonly languages: readonly string[];
}

export interface LoadThemeResult {
  /** Undefined when the theme has errors. */
  readonly theme: Theme | undefined;
  readonly issues: readonly ContentIssue[];
}

/** Path of the files belonging to a sprite asset. */
export function spriteFiles(themeDir: string, ref: string) {
  return { json: joinPath(themeDir, `${ref}.json`), image: joinPath(themeDir, `${ref}.png`) };
}

function listOf(ids: Iterable<string>): string {
  const all = [...ids];
  return all.length === 0 ? '(none)' : all.join(', ');
}

/** Reports duplicate ids in an array of entries and returns the entries by id. */
function indexById<T extends { id: string }>(
  entries: readonly T[],
  what: string,
  arrayName: string,
  file: string,
  raw: unknown,
  issues: IssueCollector,
): Map<string, T> {
  const byId = new Map<string, T>();
  const firstIndex = new Map<string, number>();
  entries.forEach((entry, index) => {
    if (byId.has(entry.id)) {
      issues.error(
        file,
        describeJsonPath(raw, [arrayName, index]),
        `Duplicate ${what} id "${entry.id}" (first defined at ${arrayName}[${firstIndex.get(entry.id)}]).`,
      );
    } else {
      byId.set(entry.id, entry);
      firstIndex.set(entry.id, index);
    }
  });
  return byId;
}

export async function loadTheme(
  files: FileProvider,
  themeId: string,
  options: LoadThemeOptions,
): Promise<LoadThemeResult> {
  const issues = new IssueCollector();
  const dir = joinPath('themes', themeId);
  const manifestFile = joinPath(dir, 'theme.json');
  const charactersFile = joinPath(dir, 'characters.json');
  const weaponsFile = joinPath(dir, 'weapons.json');
  const done = (theme?: Theme): LoadThemeResult => ({
    theme: issues.hasErrors ? undefined : theme,
    issues: issues.issues,
  });

  // 1. Manifest. An unknown format version stops everything: the rest cannot be interpreted.
  const rawManifest = await readJson(files, manifestFile, issues);
  if (rawManifest === undefined) return done();
  const version = (rawManifest as { formatVersion?: unknown }).formatVersion;
  if (version !== THEME_FORMAT_VERSION) {
    issues.error(
      manifestFile,
      'formatVersion',
      version === undefined
        ? `Missing "formatVersion". This version of the game reads "formatVersion": ${THEME_FORMAT_VERSION}.`
        : `Unsupported formatVersion ${JSON.stringify(version)}. This version of the game reads formatVersion ${THEME_FORMAT_VERSION}.`,
    );
    return done();
  }
  const manifest = validate(themeManifestSchema, rawManifest, manifestFile, issues);
  if (manifest && manifest.id !== themeId) {
    issues.error(
      manifestFile,
      'id',
      `The theme id "${manifest.id}" must match its folder name "${themeId}".`,
    );
  }

  // 2. Characters and weapons.
  const rawCharacters = await readJson(files, charactersFile, issues);
  const charactersData =
    rawCharacters === undefined
      ? undefined
      : validate(charactersFileSchema, rawCharacters, charactersFile, issues);
  const rawWeapons = await readJson(files, weaponsFile, issues);
  const weaponsData =
    rawWeapons === undefined
      ? undefined
      : validate(weaponsFileSchema, rawWeapons, weaponsFile, issues);
  if (!manifest || !charactersData || !weaponsData) return done();

  const factions = indexById(
    manifest.factions,
    'faction',
    'factions',
    manifestFile,
    rawManifest,
    issues,
  );
  const characters = indexById(
    charactersData.characters,
    'character',
    'characters',
    charactersFile,
    rawCharacters,
    issues,
  );

  const weapons = new Map<string, ThemeWeapon>();
  const weaponEntries = indexById(
    weaponsData.weapons,
    'weapon',
    'weapons',
    weaponsFile,
    rawWeapons,
    issues,
  );
  weaponsData.weapons.forEach((weapon, index) => {
    if (weaponEntries.get(weapon.id) !== weapon) return;
    const where = describeJsonPath(rawWeapons, ['weapons', index]);
    const behavior = options.behaviors.get('weapon', weapon.behavior);
    if (!behavior) {
      const known = listOf(options.behaviors.list('weapon').map((b) => b.id));
      issues.error(
        weaponsFile,
        `${where}.behavior`,
        `Unknown weapon behavior "${weapon.behavior}". Known weapon behaviors: ${known}.`,
      );
      return;
    }
    const params = validate(behavior.params, weapon.params, weaponsFile, issues, {
      root: rawWeapons,
      basePath: ['weapons', index, 'params'],
    });
    if (params === undefined) return;
    weapons.set(weapon.id, {
      id: weapon.id,
      nameKey: weapon.nameKey,
      behavior: weapon.behavior,
      params,
      sprite: weapon.sprite,
      sounds: weapon.sounds ?? {},
    });
  });

  // 3. Cross-references.
  charactersData.characters.forEach((character, index) => {
    const where = describeJsonPath(rawCharacters, ['characters', index]);
    if (!factions.has(character.faction)) {
      issues.error(
        charactersFile,
        `${where}.faction`,
        `Unknown faction "${character.faction}". Known factions (theme.json): ${listOf(factions.keys())}.`,
      );
    }
    if (!weaponEntries.has(character.weapon)) {
      issues.error(
        charactersFile,
        `${where}.weapon`,
        `Unknown weapon "${character.weapon}". Known weapons (weapons.json): ${listOf(weaponEntries.keys())}.`,
      );
    }
  });
  manifest.factions.forEach((faction, index) => {
    if (!charactersData.characters.some((c) => c.faction === faction.id)) {
      issues.error(
        manifestFile,
        describeJsonPath(rawManifest, ['factions', index]),
        `Faction "${faction.id}" has no character. Add a character with "faction": "${faction.id}" in characters.json.`,
      );
    }
  });

  // 4. Sprites: each referenced sprite is read once and checked against every use.
  const spriteUses = new Map<
    string,
    { requirements: SpriteRequirements; usedBy: string; file: string }[]
  >();
  const addUse = (ref: string, requirements: SpriteRequirements, usedBy: string, file: string) => {
    spriteUses.set(ref, [...(spriteUses.get(ref) ?? []), { requirements, usedBy, file }]);
  };
  charactersData.characters.forEach((c, i) =>
    addUse(
      c.sprite,
      CHARACTER_SPRITE,
      `${describeJsonPath(rawCharacters, ['characters', i])}.sprite`,
      charactersFile,
    ),
  );
  weaponsData.weapons.forEach((w, i) =>
    addUse(
      w.sprite,
      WEAPON_SPRITE,
      `${describeJsonPath(rawWeapons, ['weapons', i])}.sprite`,
      weaponsFile,
    ),
  );

  const sprites = new Map<string, SpriteSheet>();
  for (const [ref, uses] of spriteUses) {
    const paths = spriteFiles(dir, ref);
    const first = uses[0] as (typeof uses)[0];
    const json = await readJson(files, paths.json, issues, {
      referencedBy: `${first.file} › ${first.usedBy}`,
      hint: 'Export the sprite from Aseprite as a PNG sheet + JSON data next to its source (docs/guides/create-a-sprite.md).',
    });
    if (json === undefined) continue;
    if (!(await files.exists(paths.image))) {
      issues.error(
        paths.image,
        '',
        `Sprite sheet image not found. It must sit next to ${paths.json} with the same name.`,
      );
    }
    const sheet = parseSpriteSheet(json, paths.json, issues);
    if (!sheet) continue;
    for (const requirements of new Set(uses.map((u) => u.requirements)))
      checkSpriteRequirements(sheet, requirements, paths.json, issues);
    sprites.set(ref, sheet);
  }

  // 5. Translations: every key in the default language; other interface languages warn.
  const usedKeys = new Map<string, string>([[manifest.nameKey, `${manifestFile} › nameKey`]]);
  manifest.factions.forEach((f, i) =>
    usedKeys.set(
      f.nameKey,
      `${manifestFile} › ${describeJsonPath(rawManifest, ['factions', i])}.nameKey`,
    ),
  );
  charactersData.characters.forEach((c, i) =>
    usedKeys.set(
      c.nameKey,
      `${charactersFile} › ${describeJsonPath(rawCharacters, ['characters', i])}.nameKey`,
    ),
  );
  weaponsData.weapons.forEach((w, i) =>
    usedKeys.set(
      w.nameKey,
      `${weaponsFile} › ${describeJsonPath(rawWeapons, ['weapons', i])}.nameKey`,
    ),
  );

  const translations = new Map<string, Locale>();
  const languages = [
    manifest.defaultLanguage,
    ...options.languages.filter((l) => l !== manifest.defaultLanguage),
  ];
  for (const language of languages) {
    const file = joinPath(dir, 'locales', `${language}.json`);
    const isDefault = language === manifest.defaultLanguage;
    const text = await files.readText(file);
    if (text === undefined) {
      if (isDefault)
        issues.error(
          file,
          '',
          `Missing translation file for the theme's default language "${language}" (theme.json › defaultLanguage).`,
        );
      else
        issues.warning(
          file,
          '',
          `No "${language}" translation for this theme: its texts will be shown in "${manifest.defaultLanguage}".`,
        );
      continue;
    }
    const json = await readJson(files, file, issues);
    const locale =
      json === undefined ? undefined : parseLocale(json, file, issues, { requireMeta: false });
    if (!locale) continue;
    translations.set(language, locale);
    for (const [key, usedBy] of usedKeys) {
      if (hasKey(locale, key)) continue;
      if (isDefault)
        issues.error(
          file,
          '',
          `Missing translation "${key}" (used by ${usedBy}). The default language must contain every text.`,
        );
      else
        issues.warning(
          file,
          '',
          `Missing translation "${key}": the "${manifest.defaultLanguage}" text will be shown.`,
        );
    }
  }

  return done({
    id: manifest.id,
    dir,
    nameKey: manifest.nameKey,
    defaultLanguage: manifest.defaultLanguage,
    factions: manifest.factions,
    characters,
    weapons,
    sprites,
    translations,
  });
}
