// Schemas of theme configuration files (docs/guides/add-a-theme.md).
import type { BehaviorKind, BehaviorRegistry } from '@pixel-shoot/sim';
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
  fire: z
    .strictObject({
      burnMs: z
        .int()
        .positive()
        .default(5000)
        .describe('How long a flammable tile or object burns, in milliseconds.'),
      spreadPercent: z
        .number()
        .min(0)
        .max(100)
        .default(30)
        .describe('Chance, each second, of catching each adjacent flammable element.'),
      burningMs: z
        .int()
        .positive()
        .default(3000)
        .describe('How long a character burns after leaving the fire, in milliseconds.'),
      burningDamagePerSecond: z
        .number()
        .min(0)
        .default(8)
        .describe('Hit points a burning character loses per second.'),
    })
    .default({ burnMs: 5000, spreadPercent: 30, burningMs: 3000, burningDamagePerSecond: 8 })
    .describe('How fire behaves in this theme.'),
  effects: z
    .strictObject({
      explosion: id
        .optional()
        .describe('Effect of a blast, unless the projectile has its own impact effect.'),
      fire: id.optional().describe('Effect looping on a burning tile, object or character.'),
      smoke: id.optional().describe('Effect rising from what burnt out or was destroyed.'),
      bloodDecal: id
        .optional()
        .describe('Effect whose frames are painted on the ground where blood falls.'),
      bloodPool: id
        .optional()
        .describe('Effect whose frames are painted on the ground under a corpse.'),
    })
    .default({})
    .describe('Effects of the world itself (effects.json), not tied to a weapon or character.'),
});

const effectRef = id.describe('Effect id (effects.json).');

export const characterSchema = z.strictObject({
  id,
  nameKey: translationKey,
  faction: id.describe('Faction this character belongs to (theme.json).'),
  sprite: assetRef.describe(
    'Character sprite: tags idle, walk, death in the 5 drawn directions and a "hand" slice.',
  ),
  weapon: id.describe('Primary weapon (weapons.json); not a thrown weapon.'),
  throwable: id
    .optional()
    .describe('Thrown weapon carried along with the primary one (weapons.json).'),
  speed: z
    .number()
    .positive()
    .max(1000)
    .default(180)
    .describe('Top speed in pixels per second (one tile is 48 pixels).'),
  radius: z
    .number()
    .min(4)
    .max(23)
    .default(10)
    .describe(
      'Radius of the collision circle around the feet, in pixels; also used for bullet hits. At most 23, so a character fits through a one-tile gap.',
    ),
  hitPoints: z
    .int()
    .min(1)
    .max(10000)
    .default(100)
    .describe('Hit points at the start of each life.'),
  effects: z
    .strictObject({
      hit: effectRef.optional().describe('Effect shown where a projectile hits this character.'),
    })
    .default({})
    .describe('Visual effects of this character.'),
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
  projectile: id.describe('Projectile this weapon fires (projectiles.json).'),
  effects: z
    .strictObject({
      fire: effectRef.optional().describe('Effect shown at the muzzle at each shot.'),
    })
    .default({})
    .describe('Visual effects of this weapon.'),
  sounds: z
    .record(z.string(), z.string())
    .optional()
    .describe('Reserved for the audio milestone: sound cue name → sound id.'),
};

const projectileBase = {
  id,
  sprite: assetRef.describe(
    'Projectile sprite, drawn pointing right, with a "fly" animation and an "origin" slice at the projectile position.',
  ),
  effects: z
    .strictObject({
      impact: effectRef
        .optional()
        .describe('Effect shown where the projectile stops against an obstacle.'),
    })
    .default({})
    .describe('Visual effects of this projectile.'),
};

/**
 * Runtime schema of a file listing entries that each pick an engine behavior: parameters are
 * checked afterwards against the chosen behavior.
 */
function behaviorFileSchema<Key extends string, Shape extends z.core.$ZodShape>(
  key: Key,
  base: Shape,
  example: string,
) {
  const entry = z.strictObject({
    ...base,
    behavior: z.string().describe(`Engine behavior, e.g. "${example}".`),
    params: z.record(z.string(), z.unknown()).describe('Parameters of the behavior.'),
  });
  return z.strictObject({ $schema: schemaField, [key]: z.array(entry).min(1) } as {
    $schema: typeof schemaField;
  } & Record<Key, z.ZodArray<typeof entry>>);
}

/** Editor schema: one variant per behavior, so editors can complete the parameters. */
function behaviorEditorSchema(
  behaviors: BehaviorRegistry,
  kind: BehaviorKind,
  key: string,
  base: z.core.$ZodShape,
) {
  const variants = behaviors.list(kind).map((behavior) =>
    z.strictObject({
      ...base,
      behavior: z.literal(behavior.id).describe(behavior.description),
      params: behavior.params,
    }),
  );
  const entry =
    variants.length === 1
      ? (variants[0] as (typeof variants)[0])
      : z.discriminatedUnion('behavior', variants as [(typeof variants)[0], ...typeof variants]);
  return z.strictObject({ $schema: schemaField, [key]: z.array(entry).min(1) });
}

export const weaponsFileSchema = behaviorFileSchema('weapons', weaponBase, 'firearm');
export const projectilesFileSchema = behaviorFileSchema('projectiles', projectileBase, 'bullet');

export function weaponsEditorSchema(behaviors: BehaviorRegistry) {
  return behaviorEditorSchema(behaviors, 'weapon', 'weapons', weaponBase);
}

export function projectilesEditorSchema(behaviors: BehaviorRegistry) {
  return behaviorEditorSchema(behaviors, 'projectile', 'projectiles', projectileBase);
}

export const effectsFileSchema = z.strictObject({
  $schema: schemaField,
  effects: z
    .array(
      z.strictObject({
        id,
        sprite: assetRef.describe(
          'Effect sprite with a "play" animation; its "origin" slice is placed where the effect happens.',
        ),
      }),
    )
    .min(1),
});

export type ThemeManifest = z.infer<typeof themeManifestSchema>;
export type CharacterDefinition = z.infer<typeof characterSchema>;
export type EffectDefinition = z.infer<typeof effectsFileSchema>['effects'][number];
