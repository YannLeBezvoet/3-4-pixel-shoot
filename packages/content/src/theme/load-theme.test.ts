import { builtInBehaviors } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { memoryFileProvider } from '../files/file-provider';
import type { ContentIssue } from '../issues/issues';
import { loadTheme } from './load-theme';

const DIRECTIONS = ['down', 'down-side', 'side', 'up-side', 'up'];
const T = 'themes/test';

function sheet(tags: string[], slices: string[]) {
  return {
    frames: [{ frame: { x: 0, y: 0, w: 48, h: 48 }, duration: 100 }],
    meta: {
      frameTags: tags.map((name) => ({ name, from: 0, to: 0, direction: 'forward' })),
      slices: slices.map((name) => ({
        name,
        keys: [{ frame: 0, bounds: { x: 20, y: 30, w: 1, h: 1 }, pivot: { x: 0, y: 0 } }],
      })),
    },
  };
}

const characterTags = ['idle', 'walk', 'death'].flatMap((a) => DIRECTIONS.map((d) => `${a}.${d}`));

/** A small, valid theme; each test breaks one thing. */
function validTheme(): Record<string, unknown> {
  return {
    [`${T}/theme.json`]: {
      formatVersion: 1,
      id: 'test',
      nameKey: 'theme.name',
      defaultLanguage: 'en',
      factions: [
        { id: 'blue', nameKey: 'faction.blue' },
        { id: 'red', nameKey: 'faction.red' },
      ],
    },
    [`${T}/characters.json`]: {
      characters: [
        {
          id: 'blue-soldier',
          nameKey: 'character.blue',
          faction: 'blue',
          sprite: 'sprites/soldier',
          weapon: 'rifle',
        },
        {
          id: 'red-soldier',
          nameKey: 'character.red',
          faction: 'red',
          sprite: 'sprites/soldier',
          weapon: 'rifle',
        },
      ],
    },
    [`${T}/weapons.json`]: {
      weapons: [
        {
          id: 'rifle',
          nameKey: 'weapon.rifle',
          behavior: 'firearm',
          params: {
            fireMode: 'auto',
            roundsPerMinute: 600,
            damage: 25,
            magazine: 30,
            reloadMs: 2000,
          },
          sprite: 'sprites/rifle',
          projectile: 'bullet',
          effects: { fire: 'flash' },
        },
      ],
    },
    [`${T}/projectiles.json`]: {
      projectiles: [
        {
          id: 'bullet',
          behavior: 'bullet',
          params: { speed: 1500, range: 900 },
          sprite: 'sprites/bullet',
          effects: { impact: 'puff' },
        },
      ],
    },
    [`${T}/effects.json`]: {
      effects: [
        { id: 'flash', sprite: 'sprites/flash' },
        { id: 'puff', sprite: 'sprites/flash' },
      ],
    },
    [`${T}/sprites/soldier.json`]: sheet(characterTags, ['hand']),
    [`${T}/sprites/soldier.png`]: '',
    [`${T}/sprites/rifle.json`]: sheet(['idle'], ['grip', 'muzzle']),
    [`${T}/sprites/rifle.png`]: '',
    [`${T}/sprites/bullet.json`]: sheet(['fly'], ['origin']),
    [`${T}/sprites/bullet.png`]: '',
    [`${T}/sprites/flash.json`]: sheet(['play'], []),
    [`${T}/sprites/flash.png`]: '',
    [`${T}/locales/en.json`]: {
      theme: { name: 'Test' },
      faction: { blue: 'Blue', red: 'Red' },
      character: { blue: 'Blue soldier', red: 'Red soldier' },
      weapon: { rifle: 'Rifle' },
    },
    [`${T}/locales/fr.json`]: {
      theme: { name: 'Test' },
      faction: { blue: 'Bleus', red: 'Rouges' },
      character: { blue: 'Soldat bleu', red: 'Soldat rouge' },
      weapon: { rifle: 'Fusil' },
    },
  };
}

type Files = Record<string, unknown>;

async function load(files: Files) {
  const texts = Object.fromEntries(
    Object.entries(files).map(([path, value]) => [
      path,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]),
  );
  return loadTheme(memoryFileProvider(texts), 'test', {
    behaviors: builtInBehaviors,
    languages: ['en', 'fr'],
  });
}

/** Applies a change to a copy of the valid theme. */
function broken(change: (files: Files) => void): Files {
  const files = structuredClone(validTheme());
  change(files);
  return files;
}

const json = (files: Files, path: string) => files[`${T}/${path}`] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function error(file: string, location: string, message: string): ContentIssue {
  return { severity: 'error', file: `${T}/${file}`, location, message };
}

describe('loadTheme', () => {
  it('loads a valid theme with no issues', async () => {
    const { theme, issues } = await load(validTheme());
    expect(issues).toEqual([]);
    expect(theme?.factions.map((f) => f.id)).toEqual(['blue', 'red']);
    expect(theme?.weapons.get('rifle')?.params).toMatchObject({
      spreadDeg: 0,
      reserveMagazines: null,
    });
    expect([...(theme?.sprites.keys() ?? [])]).toEqual([
      'sprites/soldier',
      'sprites/rifle',
      'sprites/bullet',
      'sprites/flash',
    ]);
    // Character stats take their defaults (Q54).
    expect(theme?.characters.get('blue-soldier')).toMatchObject({
      speed: 180,
      radius: 10,
      hitPoints: 100,
      effects: {},
    });
    expect(theme?.weapons.get('rifle')).toMatchObject({
      projectile: 'bullet',
      effects: { fire: 'flash' },
    });
    expect(theme?.projectiles.get('bullet')).toEqual({
      id: 'bullet',
      behavior: 'bullet',
      params: { speed: 1500, range: 900 },
      sprite: 'sprites/bullet',
      effects: { impact: 'puff' },
    });
    expect([...(theme?.effects.keys() ?? [])]).toEqual(['flash', 'puff']);
    expect(theme?.translations.get('fr')?.strings.get('weapon.rifle')).toBe('Fusil');
  });

  it('reports a missing sprite file with what references it', async () => {
    const { theme, issues } = await load(broken((f) => delete f[`${T}/sprites/soldier.json`]));
    expect(theme).toBeUndefined();
    expect(issues).toContainEqual(
      error(
        'sprites/soldier.json',
        '',
        'File not found (referenced by themes/test/characters.json › characters[0] ("blue-soldier").sprite). Export the sprite from Aseprite as a PNG sheet + JSON data next to its source (docs/guides/create-a-sprite.md).',
      ),
    );
  });

  it('reports a missing sprite image', async () => {
    const { issues } = await load(broken((f) => delete f[`${T}/sprites/rifle.png`]));
    expect(issues).toContainEqual(
      error(
        'sprites/rifle.png',
        '',
        'Sprite sheet image not found. It must sit next to themes/test/sprites/rifle.json with the same name.',
      ),
    );
  });

  it('reports an unknown weapon reference', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'characters.json').characters[0].weapon = 'rifel')),
    );
    expect(issues).toEqual([
      error(
        'characters.json',
        'characters[0] ("blue-soldier").weapon',
        'Unknown weapon "rifel". Known weapons (weapons.json): rifle.',
      ),
    ]);
  });

  it('checks the throwable of a character (Q61)', async () => {
    const { issues } = await load(
      broken((f) => {
        json(f, 'characters.json').characters[0].throwable = 'rifle';
        json(f, 'characters.json').characters[1].throwable = 'frag';
      }),
    );
    expect(issues).toEqual([
      error(
        'characters.json',
        'characters[0] ("blue-soldier").throwable',
        '"rifle" is not a thrown weapon: its behavior must be "thrown".',
      ),
      error(
        'characters.json',
        'characters[1] ("red-soldier").throwable',
        'Unknown weapon "frag". Known weapons (weapons.json): rifle.',
      ),
    ]);
  });

  it('refuses a thrown weapon as primary weapon and a projectile of the wrong kind', async () => {
    const { issues } = await load(
      broken((f) => {
        const rifle = json(f, 'weapons.json').weapons[0];
        rifle.behavior = 'thrown';
        rifle.params = { maxRange: 384 };
      }),
    );
    expect(issues).toEqual([
      error(
        'characters.json',
        'characters[0] ("blue-soldier").weapon',
        '"rifle" is a thrown weapon: use it as "throwable", with a primary weapon as "weapon".',
      ),
      error(
        'characters.json',
        'characters[1] ("red-soldier").weapon',
        '"rifle" is a thrown weapon: use it as "throwable", with a primary weapon as "weapon".',
      ),
      error(
        'weapons.json',
        'weapons[0] ("rifle").projectile',
        'A weapon of behavior "thrown" fires a projectile of behavior "grenade"; "bullet" is "bullet".',
      ),
    ]);
  });

  it('checks the world effects of the manifest', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'theme.json').effects = { fire: 'blaze' })),
    );
    expect(issues).toEqual([
      error(
        'theme.json',
        'effects.fire',
        'Unknown effect "blaze". Known effects (effects.json): flash, puff.',
      ),
    ]);
  });

  it('gives fire its default values (Q63, Q70)', async () => {
    const { theme } = await load(validTheme());
    expect(theme?.fire).toEqual({
      burnMs: 5000,
      spreadPercent: 30,
      burningMs: 3000,
      burningDamagePerSecond: 8,
    });
    expect(theme?.worldEffects).toEqual({});
  });

  it('reports an unknown faction', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'characters.json').characters[1].faction = 'green')),
    );
    expect(issues).toContainEqual(
      error(
        'characters.json',
        'characters[1] ("red-soldier").faction',
        'Unknown faction "green". Known factions (theme.json): blue, red.',
      ),
    );
    expect(issues).toContainEqual(
      error(
        'theme.json',
        'factions[1] ("red")',
        'Faction "red" has no character. Add a character with "faction": "red" in characters.json.',
      ),
    );
  });

  it('reports frame sizes that are not multiples of 48', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'sprites/rifle.json').frames[0].frame.w = 40)),
    );
    expect(issues).toEqual([
      error(
        'sprites/rifle.json',
        'frames',
        'Frames are 40×48 px; frame sides must be multiples of 48 px (48, 96, 144…).',
      ),
    ]);
  });

  it('reports a missing direction tag', async () => {
    const files = broken((f) => {
      const tags = json(f, 'sprites/soldier.json').meta.frameTags as { name: string }[];
      json(f, 'sprites/soldier.json').meta.frameTags = tags.filter(
        (t) => t.name !== 'walk.up-side',
      );
    });
    expect((await load(files)).issues).toEqual([
      error(
        'sprites/soldier.json',
        'meta.frameTags',
        'Missing animation tag "walk.up-side". A character needs the actions idle, walk, death in the 5 drawn directions: down, down-side, side, up-side, up.',
      ),
    ]);
  });

  it('reports a missing hand slice', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'sprites/soldier.json').meta.slices = [])),
    );
    expect(issues).toEqual([
      error(
        'sprites/soldier.json',
        'meta.slices',
        'Missing slice "hand" (the point where the weapon grip attaches). Add a slice named "hand" in Aseprite, set its pivot, and export with slices.',
      ),
    ]);
  });

  it('reports an invalid weapon parameter at its exact location', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'weapons.json').weapons[0].params.magazine = 0)),
    );
    expect(issues).toEqual([
      error(
        'weapons.json',
        'weapons[0] ("rifle").params.magazine',
        'Too small: expected number to be >=1',
      ),
    ]);
  });

  it('reports an unknown weapon behavior with the known ones', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'weapons.json').weapons[0].behavior = 'firarm')),
    );
    expect(issues).toEqual([
      error(
        'weapons.json',
        'weapons[0] ("rifle").behavior',
        'Unknown weapon behavior "firarm". Known weapon behaviors: firearm, flamethrower, thrown.',
      ),
    ]);
  });

  it('refuses an unknown format version', async () => {
    const { issues } = await load(broken((f) => (json(f, 'theme.json').formatVersion = 2)));
    expect(issues).toEqual([
      error(
        'theme.json',
        'formatVersion',
        'Unsupported formatVersion 2. This version of the game reads formatVersion 1.',
      ),
    ]);
  });

  it('reports a text missing from the default language as an error', async () => {
    const { issues } = await load(broken((f) => delete json(f, 'locales/en.json').weapon));
    expect(issues).toEqual([
      error(
        'locales/en.json',
        '',
        'Missing translation "weapon.rifle" (used by themes/test/weapons.json › weapons[0] ("rifle").nameKey). The default language must contain every text.',
      ),
    ]);
  });

  it('only warns about texts missing from other languages, and still loads', async () => {
    const files = broken((f) => {
      delete json(f, 'locales/fr.json').weapon;
    });
    const { theme, issues } = await load(files);
    expect(theme).toBeDefined();
    expect(issues).toEqual([
      {
        severity: 'warning',
        file: `${T}/locales/fr.json`,
        location: '',
        message: 'Missing translation "weapon.rifle": the "en" text will be shown.',
      },
    ]);
    const noFrench = await load(broken((f) => delete f[`${T}/locales/fr.json`]));
    expect(noFrench.theme).toBeDefined();
    expect(noFrench.issues[0]?.message).toBe(
      'No "fr" translation for this theme: its texts will be shown in "en".',
    );
  });

  it('reports duplicate ids', async () => {
    const files = broken((f) => {
      const weapons = json(f, 'weapons.json').weapons as object[];
      weapons.push(structuredClone(weapons[0]!));
    });
    expect((await load(files)).issues).toEqual([
      error(
        'weapons.json',
        'weapons[1] ("rifle")',
        'Duplicate weapon id "rifle" (first defined at weapons[0]).',
      ),
    ]);
  });

  it('reports misspelled fields', async () => {
    const files = broken((f) => {
      const weapon = json(f, 'weapons.json').weapons[0];
      weapon.nmeKey = weapon.nameKey;
      delete weapon.nameKey;
    });
    const { issues } = await load(files);
    expect(issues).toContainEqual(
      error(
        'weapons.json',
        'weapons[0] ("rifle")',
        'Unknown field "nmeKey". Check the spelling against the documentation.',
      ),
    );
    expect(issues).toContainEqual(
      error(
        'weapons.json',
        'weapons[0] ("rifle").nameKey',
        'Missing required field (expected string).',
      ),
    );
  });

  it('reports invalid JSON', async () => {
    const files = validTheme();
    const { issues } = await loadTheme(
      memoryFileProvider({
        ...Object.fromEntries(Object.entries(files).map(([p, v]) => [p, JSON.stringify(v)])),
        [`${T}/weapons.json`]: '{ "weapons": [ }',
      }),
      'test',
      { behaviors: builtInBehaviors, languages: ['en'] },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: `${T}/weapons.json`, location: '' });
    expect(issues[0]?.message).toMatch(/^Invalid JSON: /);
  });

  it('reports an unknown projectile reference', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'weapons.json').weapons[0].projectile = 'bulet')),
    );
    expect(issues).toEqual([
      error(
        'weapons.json',
        'weapons[0] ("rifle").projectile',
        'Unknown projectile "bulet". Known projectiles (projectiles.json): bullet.',
      ),
    ]);
  });

  it('reports unknown effects wherever they are used', async () => {
    const { issues } = await load(
      broken((f) => {
        json(f, 'characters.json').characters[0].effects = { hit: 'blood' };
        json(f, 'weapons.json').weapons[0].effects.fire = 'flahs';
        json(f, 'projectiles.json').projectiles[0].effects.impact = 'dust';
      }),
    );
    expect(issues).toEqual([
      error(
        'characters.json',
        'characters[0] ("blue-soldier").effects.hit',
        'Unknown effect "blood". Known effects (effects.json): flash, puff.',
      ),
      error(
        'weapons.json',
        'weapons[0] ("rifle").effects.fire',
        'Unknown effect "flahs". Known effects (effects.json): flash, puff.',
      ),
      error(
        'projectiles.json',
        'projectiles[0] ("bullet").effects.impact',
        'Unknown effect "dust". Known effects (effects.json): flash, puff.',
      ),
    ]);
  });

  it('accepts a theme without effects.json when no effect is used', async () => {
    const { theme, issues } = await load(
      broken((f) => {
        delete f[`${T}/effects.json`];
        delete json(f, 'weapons.json').weapons[0].effects;
        delete json(f, 'projectiles.json').projectiles[0].effects;
      }),
    );
    expect(issues).toEqual([]);
    expect(theme?.effects.size).toBe(0);
  });

  it('requires projectiles.json', async () => {
    const { theme, issues } = await load(broken((f) => delete f[`${T}/projectiles.json`]));
    expect(theme).toBeUndefined();
    expect(issues).toEqual([error('projectiles.json', '', 'File not found.')]);
  });

  it('reports an unknown projectile behavior and invalid projectile parameters', async () => {
    const unknown = await load(
      broken((f) => (json(f, 'projectiles.json').projectiles[0].behavior = 'rocket')),
    );
    expect(unknown.issues).toEqual([
      error(
        'projectiles.json',
        'projectiles[0] ("bullet").behavior',
        'Unknown projectile behavior "rocket". Known projectile behaviors: bullet, grenade, flame.',
      ),
    ]);
    const tooFast = await load(
      broken((f) => (json(f, 'projectiles.json').projectiles[0].params.speed = 9000)),
    );
    expect(tooFast.issues).toEqual([
      error(
        'projectiles.json',
        'projectiles[0] ("bullet").params.speed',
        'Too big: expected number to be <=6000',
      ),
    ]);
  });

  it('checks projectile and effect sprites', async () => {
    const { issues } = await load(
      broken((f) => {
        json(f, 'sprites/bullet.json').meta.slices = [];
        json(f, 'sprites/flash.json').meta.frameTags[0].name = 'boom';
      }),
    );
    expect(issues).toEqual([
      error(
        'sprites/bullet.json',
        'meta.slices',
        'Missing slice "origin" (the projectile position: the sprite is drawn there and rotates around it). Add a slice named "origin" in Aseprite, set its pivot, and export with slices.',
      ),
      error(
        'sprites/flash.json',
        'meta.frameTags',
        'Missing animation tag "play". An effect sprite needs the animation "play".',
      ),
    ]);
  });

  it('refuses a character too wide to pass a one-tile gap', async () => {
    const { issues } = await load(
      broken((f) => (json(f, 'characters.json').characters[0].radius = 30)),
    );
    expect(issues).toEqual([
      error(
        'characters.json',
        'characters[0] ("blue-soldier").radius',
        'Too big: expected number to be <=23',
      ),
    ]);
  });

  it('requires the theme id to match its folder', async () => {
    const { issues } = await load(broken((f) => (json(f, 'theme.json').id = 'other')));
    expect(issues).toEqual([
      error('theme.json', 'id', 'The theme id "other" must match its folder name "test".'),
    ]);
  });
});
