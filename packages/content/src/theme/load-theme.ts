// Loads a theme folder and validates it completely: schemas, behavior parameters,
// cross-references, sprites and translations. Every problem is collected.
import type { BehaviorKind, BehaviorRegistry } from '@pixel-shoot/sim';
import type { FileProvider } from '../files/file-provider';
import { joinPath } from '../files/file-provider';
import { readJson } from '../files/read-json';
import type { ContentIssue } from '../issues/issues';
import { IssueCollector, describeJsonPath } from '../issues/issues';
import { validate } from '../issues/zod';
import type { Locale } from '../locales/locale';
import { hasKey, parseLocale } from '../locales/locale';
import type { SpriteRequirements } from '../sprites/conventions';
import {
  CHARACTER_SPRITE,
  EFFECT_SPRITE,
  PROJECTILE_SPRITE,
  WEAPON_SPRITE,
} from '../sprites/conventions';
import type { SpriteSheet } from '../sprites/sprite-sheet';
import { checkSpriteRequirements, parseSpriteSheet } from '../sprites/sprite-sheet';
import type { CharacterDefinition, EffectDefinition, ThemeManifest } from './schemas';
import {
  THEME_FORMAT_VERSION,
  charactersFileSchema,
  effectsFileSchema,
  projectilesFileSchema,
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
  /** Projectile id (projectiles.json). */
  readonly projectile: string;
  readonly effects: { readonly fire?: string };
  readonly sounds: Readonly<Record<string, string>>;
}

export interface ThemeProjectile {
  readonly id: string;
  readonly behavior: string;
  /** Parameters validated by the behavior's schema, defaults applied. */
  readonly params: unknown;
  readonly sprite: string;
  readonly effects: { readonly impact?: string };
}

export type ThemeCharacter = CharacterDefinition;
export type ThemeEffect = EffectDefinition;

export interface Theme {
  readonly id: string;
  /** Folder of the theme relative to the content root, e.g. "themes/vietnam". */
  readonly dir: string;
  readonly nameKey: string;
  readonly defaultLanguage: string;
  readonly factions: ThemeManifest['factions'];
  readonly characters: ReadonlyMap<string, ThemeCharacter>;
  readonly weapons: ReadonlyMap<string, ThemeWeapon>;
  readonly projectiles: ReadonlyMap<string, ThemeProjectile>;
  readonly effects: ReadonlyMap<string, ThemeEffect>;
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

/**
 * Checks that each entry names a known behavior of `kind` and that its parameters are valid
 * for it. Returns the valid entries with their parameters parsed (defaults applied).
 */
function checkBehaviors<T extends { id: string; behavior: string; params: unknown }>(
  entries: readonly T[],
  byId: ReadonlyMap<string, T>,
  kind: BehaviorKind,
  arrayName: string,
  file: string,
  raw: unknown,
  behaviors: BehaviorRegistry,
  issues: IssueCollector,
): Map<string, T> {
  const valid = new Map<string, T>();
  entries.forEach((entry, index) => {
    if (byId.get(entry.id) !== entry) return;
    const where = describeJsonPath(raw, [arrayName, index]);
    const behavior = behaviors.get(kind, entry.behavior);
    if (!behavior) {
      const known = listOf(behaviors.list(kind).map((b) => b.id));
      issues.error(
        file,
        `${where}.behavior`,
        `Unknown ${kind} behavior "${entry.behavior}". Known ${kind} behaviors: ${known}.`,
      );
      return;
    }
    const params = validate(behavior.params, entry.params, file, issues, {
      root: raw,
      basePath: [arrayName, index, 'params'],
    });
    if (params !== undefined) valid.set(entry.id, { ...entry, params });
  });
  return valid;
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
  const projectilesFile = joinPath(dir, 'projectiles.json');
  const effectsFile = joinPath(dir, 'effects.json');
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

  // 2. Characters, weapons, projectiles and effects (effects.json is optional).
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
  const rawProjectiles = await readJson(files, projectilesFile, issues);
  const projectilesData =
    rawProjectiles === undefined
      ? undefined
      : validate(projectilesFileSchema, rawProjectiles, projectilesFile, issues);
  const hasEffects = await files.exists(effectsFile);
  const rawEffects = hasEffects ? await readJson(files, effectsFile, issues) : undefined;
  const effectsData = !hasEffects
    ? { effects: [] }
    : rawEffects === undefined
      ? undefined
      : validate(effectsFileSchema, rawEffects, effectsFile, issues);
  if (!manifest || !charactersData || !weaponsData || !projectilesData || !effectsData)
    return done();

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
  const weaponEntries = indexById(
    weaponsData.weapons,
    'weapon',
    'weapons',
    weaponsFile,
    rawWeapons,
    issues,
  );
  const projectileEntries = indexById(
    projectilesData.projectiles,
    'projectile',
    'projectiles',
    projectilesFile,
    rawProjectiles,
    issues,
  );
  const effectList: readonly ThemeEffect[] = effectsData.effects;
  const effects = indexById(effectList, 'effect', 'effects', effectsFile, rawEffects, issues);

  const weapons = new Map<string, ThemeWeapon>();
  for (const [id, weapon] of checkBehaviors(
    weaponsData.weapons,
    weaponEntries,
    'weapon',
    'weapons',
    weaponsFile,
    rawWeapons,
    options.behaviors,
    issues,
  )) {
    weapons.set(id, {
      id,
      nameKey: weapon.nameKey,
      behavior: weapon.behavior,
      params: weapon.params,
      sprite: weapon.sprite,
      projectile: weapon.projectile,
      effects: weapon.effects,
      sounds: weapon.sounds ?? {},
    });
  }
  const projectiles = new Map<string, ThemeProjectile>();
  for (const [id, projectile] of checkBehaviors(
    projectilesData.projectiles,
    projectileEntries,
    'projectile',
    'projectiles',
    projectilesFile,
    rawProjectiles,
    options.behaviors,
    issues,
  )) {
    projectiles.set(id, {
      id,
      behavior: projectile.behavior,
      params: projectile.params,
      sprite: projectile.sprite,
      effects: projectile.effects,
    });
  }

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
  weaponsData.weapons.forEach((weapon, index) => {
    if (!projectileEntries.has(weapon.projectile)) {
      issues.error(
        weaponsFile,
        `${describeJsonPath(rawWeapons, ['weapons', index])}.projectile`,
        `Unknown projectile "${weapon.projectile}". Known projectiles (projectiles.json): ${listOf(projectileEntries.keys())}.`,
      );
    }
  });
  const checkEffect = (effect: string | undefined, file: string, location: string) => {
    if (effect === undefined || effects.has(effect)) return;
    issues.error(
      file,
      location,
      `Unknown effect "${effect}". Known effects (effects.json): ${listOf(effects.keys())}.`,
    );
  };
  charactersData.characters.forEach((c, i) =>
    checkEffect(
      c.effects.hit,
      charactersFile,
      `${describeJsonPath(rawCharacters, ['characters', i])}.effects.hit`,
    ),
  );
  weaponsData.weapons.forEach((w, i) =>
    checkEffect(
      w.effects.fire,
      weaponsFile,
      `${describeJsonPath(rawWeapons, ['weapons', i])}.effects.fire`,
    ),
  );
  projectilesData.projectiles.forEach((p, i) =>
    checkEffect(
      p.effects.impact,
      projectilesFile,
      `${describeJsonPath(rawProjectiles, ['projectiles', i])}.effects.impact`,
    ),
  );
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

  projectilesData.projectiles.forEach((p, i) =>
    addUse(
      p.sprite,
      PROJECTILE_SPRITE,
      `${describeJsonPath(rawProjectiles, ['projectiles', i])}.sprite`,
      projectilesFile,
    ),
  );
  effectList.forEach((e, i) =>
    addUse(
      e.sprite,
      EFFECT_SPRITE,
      `${describeJsonPath(rawEffects, ['effects', i])}.sprite`,
      effectsFile,
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
    projectiles,
    effects,
    sprites,
    translations,
  });
}
