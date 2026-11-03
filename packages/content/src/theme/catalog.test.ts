import { builtInBehaviors } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { memoryFileProvider } from '../files/file-provider';
import { parseSpriteSheet } from '../sprites/sprite-sheet';
import { IssueCollector } from '../issues/issues';
import { barrelLength, buildCatalog, handPosition } from './catalog';
import { loadTheme } from './load-theme';

/** A one-frame sheet with slices at given points (pivots at the slice corner). */
function sheet(tags: string[], slices: Record<string, { x: number; y: number }>) {
  return {
    frames: [{ frame: { x: 0, y: 0, w: 48, h: 48 }, duration: 100 }],
    meta: {
      frameTags: tags.map((name) => ({ name, from: 0, to: 0, direction: 'forward' })),
      slices: Object.entries(slices).map(([name, at]) => ({
        name,
        keys: [{ frame: 0, bounds: { x: at.x, y: at.y, w: 1, h: 1 }, pivot: { x: 0, y: 0 } }],
      })),
    },
  };
}
const parse = (json: unknown) => parseSpriteSheet(json, 'test.json', new IssueCollector())!;

describe('sprite measurements', () => {
  it('measures the hands against the ground point (bottom center by default)', () => {
    expect(handPosition(parse(sheet(['idle.side'], { hand: { x: 30, y: 27 } })))).toEqual({
      gunHeight: 20,
      handReach: 6,
    });
    const withOrigin = sheet(['idle.side'], { hand: { x: 30, y: 27 }, origin: { x: 20, y: 40 } });
    expect(handPosition(parse(withOrigin))).toEqual({ gunHeight: 13, handReach: 10 });
  });

  it('measures the barrel from grip to muzzle', () => {
    const rifle = sheet(['idle'], { grip: { x: 10, y: 24 }, muzzle: { x: 40, y: 20 } });
    expect(barrelLength(parse(rifle))).toBeCloseTo(Math.hypot(30, 4), 9);
    expect(barrelLength(parse(sheet(['idle'], {})))).toBe(0);
  });
});

describe('buildCatalog', () => {
  it('converts a theme into the simulation catalog', async () => {
    const T = 'themes/t';
    const directions = ['down', 'down-side', 'side', 'up-side', 'up'];
    const tags = ['idle', 'walk', 'death'].flatMap((a) => directions.map((d) => `${a}.${d}`));
    const files: Record<string, unknown> = {
      [`${T}/theme.json`]: {
        formatVersion: 1,
        id: 't',
        nameKey: 'theme.name',
        defaultLanguage: 'en',
        factions: [{ id: 'a', nameKey: 'faction.a' }],
      },
      [`${T}/characters.json`]: {
        characters: [
          {
            id: 'soldier',
            nameKey: 'character.soldier',
            faction: 'a',
            sprite: 'sprites/soldier',
            weapon: 'rifle',
            speed: 150,
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
              fireMode: 'semi',
              roundsPerMinute: 400,
              damage: 40,
              magazine: 5,
              reloadMs: 1000,
            },
            sprite: 'sprites/rifle',
            projectile: 'slug',
          },
        ],
      },
      [`${T}/projectiles.json`]: {
        projectiles: [
          {
            id: 'slug',
            behavior: 'bullet',
            params: { speed: 1200, range: 600 },
            sprite: 'sprites/slug',
          },
        ],
      },
      [`${T}/sprites/soldier.json`]: sheet(tags, { hand: { x: 30, y: 27 } }),
      [`${T}/sprites/soldier.png`]: '',
      [`${T}/sprites/rifle.json`]: sheet(['idle'], {
        grip: { x: 10, y: 24 },
        muzzle: { x: 30, y: 24 },
      }),
      [`${T}/sprites/rifle.png`]: '',
      [`${T}/sprites/slug.json`]: sheet(['fly'], { origin: { x: 24, y: 24 } }),
      [`${T}/sprites/slug.png`]: '',
      [`${T}/locales/en.json`]: {
        theme: { name: 'T' },
        faction: { a: 'A' },
        character: { soldier: 'Soldier' },
        weapon: { rifle: 'Rifle' },
      },
    };
    const texts = Object.fromEntries(
      Object.entries(files).map(([path, value]) => [
        path,
        typeof value === 'string' ? value : JSON.stringify(value),
      ]),
    );
    const { theme, issues } = await loadTheme(memoryFileProvider(texts), 't', {
      behaviors: builtInBehaviors,
      languages: ['en'],
    });
    expect(issues).toEqual([]);
    const catalog = buildCatalog(theme!);
    expect(catalog.characters.get('soldier')).toEqual({
      id: 'soldier',
      speed: 150,
      radius: 10,
      hitPoints: 100,
      weapon: 'rifle',
      gunHeight: 20,
      handReach: 6,
    });
    expect(catalog.weapons.get('rifle')).toEqual({
      id: 'rifle',
      behavior: 'firearm',
      params: {
        fireMode: 'semi',
        roundsPerMinute: 400,
        damage: 40,
        spreadDeg: 0,
        magazine: 5,
        reloadMs: 1000,
        reserveMagazines: null,
      },
      projectile: 'slug',
      barrelLength: 20,
    });
    expect(catalog.projectiles.get('slug')).toEqual({
      id: 'slug',
      behavior: 'bullet',
      params: { speed: 1200, range: 600 },
    });
  });
});
