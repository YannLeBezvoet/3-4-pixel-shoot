// Turns a loaded theme into the simulation's catalog: gameplay values in engine units, plus
// the few values measured on sprites (ARCHITECTURE §8.3): how high and how far ahead the
// hands hold the weapon, and the weapon's length from grip to muzzle.
import type { Catalog, CharacterStats, ProjectileStats, WeaponStats } from '@pixel-shoot/sim';
import { createCatalog, msToTicks } from '@pixel-shoot/sim';
import { tagName } from '../sprites/conventions';
import type { SpriteSheet } from '../sprites/sprite-sheet';
import { originOf, slicePoint } from '../sprites/sprite-sheet';
import type { Theme } from './load-theme';

/** First frame of an animation, or frame 0 when the sheet has no such animation. */
function firstFrame(sheet: SpriteSheet, animation: string): number {
  return sheet.animations.get(animation)?.from ?? 0;
}

function sheetOf(theme: Theme, ref: string): SpriteSheet {
  const sheet = theme.sprites.get(ref);
  if (!sheet) throw new Error(`Theme "${theme.id}" has no loaded sprite "${ref}".`);
  return sheet;
}

/** Where the hands are, measured on the first frame of `idle.side` (drawn facing right). */
export function handPosition(sheet: SpriteSheet): { gunHeight: number; handReach: number } {
  const frame = firstFrame(sheet, tagName('idle', 'side'));
  const origin = originOf(sheet, frame);
  const hand = slicePoint(sheet, 'hand', frame) ?? origin;
  return { gunHeight: origin.y - hand.y, handReach: hand.x - origin.x };
}

/** Distance from the grip to the muzzle on the weapon's first frame. */
export function barrelLength(sheet: SpriteSheet): number {
  const frame = firstFrame(sheet, 'idle');
  const grip = slicePoint(sheet, 'grip', frame);
  const muzzle = slicePoint(sheet, 'muzzle', frame);
  return grip && muzzle ? Math.hypot(muzzle.x - grip.x, muzzle.y - grip.y) : 0;
}

/** The simulation catalog of a theme loaded without errors. */
export function buildCatalog(theme: Theme): Catalog {
  const characters: CharacterStats[] = [...theme.characters.values()].map((c) => ({
    id: c.id,
    speed: c.speed,
    radius: c.radius,
    hitPoints: c.hitPoints,
    weapon: c.weapon,
    ...(c.throwable !== undefined && { throwable: c.throwable }),
    ...handPosition(sheetOf(theme, c.sprite)),
  }));
  // Behaviors and parameters were validated by loadTheme against the engine's registry.
  const weapons = [...theme.weapons.values()].map(
    (w) =>
      ({
        id: w.id,
        behavior: w.behavior,
        params: w.params,
        projectile: w.projectile,
        barrelLength: barrelLength(sheetOf(theme, w.sprite)),
      }) as WeaponStats,
  );
  const projectiles = [...theme.projectiles.values()].map(
    (p) => ({ id: p.id, behavior: p.behavior, params: p.params }) as ProjectileStats,
  );
  const { burnMs, spreadPercent, burningMs, burningDamagePerSecond } = theme.fire;
  return createCatalog({
    characters,
    weapons,
    projectiles,
    fire: {
      burnTicks: msToTicks(burnMs),
      spreadChance: spreadPercent / 100,
      characterBurnTicks: msToTicks(burningMs),
      characterDamagePerSecond: burningDamagePerSecond,
    },
  });
}
