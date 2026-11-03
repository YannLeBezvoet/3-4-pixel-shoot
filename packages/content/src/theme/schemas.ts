// Schemas of theme configuration files (docs/guides/add-a-theme.md).
import type { BehaviorRegistry } from '@pixel-shoot/sim';
import { z } from 'zod';

export const THEME_FORMAT_VERSION = 1;

export const id = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Ids use lowercase letters, digits and single hyphens, e.g. "us-rifleman".',
  )
  .describe('Identifier, unique within its file: lowercase letters, digits and hyphens.');

export const translationKey = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/,
    'Translation keys are dot-separated words, e.g. "weapon.m16a1.name".',
  )
  .describe('Key of a text in the theme translation files (locales/<language>.json).');

export const assetRef = z
  .string()
  .regex(
    /^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/,
    'Asset paths are relative to the theme folder, lowercase, without extension, e.g. "sprites/weapons/m16a1".',
  )
  .describe(
    'Path of a sprite relative to the theme folder, without extension: <path>.png and <path>.json are used.',
  );

const languageCode = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Language codes look like "en", "fr" or "pt-BR".');

const schemaField = z
  .string()
  .optional()
  .describe('Path to the JSON Schema, for editor autocompletion.');

export const themeManifestSchema = z.strictObject({
  $schema: schemaField,
  formatVersion: z.literal(THEME_FORMAT_VERSION).describe('Version of the theme format.'),
  id: id.describe('Theme identifier; must match the theme folder name.'),
  nameKey: translationKey.describe('Translation key of the theme name.'),
  defaultLanguage: languageCode.describe(
    'Language whose translation file must contain every text of the theme.',
  ),
  factions: z
    .array(z.strictObject({ id, nameKey: translationKey }))
    .min(1)
    .describe(
      'Sides that teams play. Team 1 plays the first faction, team 2 the second, and so on.',
    ),
});

export const characterSchema = z.strictObject({
  id,
  nameKey: translationKey,
  faction: id.describe('Faction this character belongs to (theme.json).'),
  sprite: assetRef.describe(
    'Character sprite: tags idle, walk, death in the 5 drawn directions and a "hand" slice.',
  ),
  weapon: id.describe('Default weapon (weapons.json).'),
});

export const charactersFileSchema = z.strictObject({
  $schema: schemaField,
  characters: z.array(characterSchema).min(1),
});

const weaponBase = {
  id,
  nameKey: translationKey,
  sprite: assetRef.describe(
    'Weapon sprite, drawn pointing right, with "grip" and "muzzle" slices.',
  ),
  sounds: z
    .record(z.string(), z.string())
    .optional()
    .describe('Reserved for the audio milestone: sound cue name → sound id.'),
};

/** Runtime schema: parameters are checked afterwards against the chosen behavior. */
export const weaponsFileSchema = z.strictObject({
  $schema: schemaField,
  weapons: z
    .array(
      z.strictObject({
        ...weaponBase,
        behavior: z.string().describe('Engine weapon behavior, e.g. "firearm".'),
        params: z.record(z.string(), z.unknown()).describe('Parameters of the behavior.'),
      }),
    )
    .min(1),
});

/** Editor schema: one variant per weapon behavior, so editors can complete the parameters. */
export function weaponsEditorSchema(behaviors: BehaviorRegistry) {
  const variants = behaviors.list('weapon').map((behavior) =>
    z.strictObject({
      ...weaponBase,
      behavior: z.literal(behavior.id).describe(behavior.description),
      params: behavior.params,
    }),
  );
  return z.strictObject({
    $schema: schemaField,
    weapons: z
      .array(
        variants.length === 1
          ? (variants[0] as (typeof variants)[0])
          : z.discriminatedUnion(
              'behavior',
              variants as [(typeof variants)[0], ...typeof variants],
            ),
      )
      .min(1),
  });
}

export type ThemeManifest = z.infer<typeof themeManifestSchema>;
export type CharacterDefinition = z.infer<typeof characterSchema>;
