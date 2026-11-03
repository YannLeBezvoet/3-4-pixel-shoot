// What each gameplay id of a theme looks like: characters (body and weapon sheets),
// projectiles and effects. The simulation only knows ids (ARCHITECTURE §5).
import type { LoadedSheet, ThemeAssets } from '../content/content-store';
import type { CharacterLook } from './character-view';

export interface SheetLook {
  /** Identifies the sheet across reloads. */
  readonly key: string;
  readonly sheet: LoadedSheet;
}

export interface ThemeLooks {
  character(id: string): CharacterLook | undefined;
  projectile(kind: string): SheetLook | undefined;
  effect(id: string | undefined): SheetLook | undefined;
  /** Effect shown at the muzzle when a weapon fires. */
  fireEffect(weapon: string): SheetLook | undefined;
  /** Effect shown where a projectile hits a character of this kind. */
  hitEffect(character: string): SheetLook | undefined;
  /** Effect shown where a projectile stops against an obstacle. */
  impactEffect(projectile: string): SheetLook | undefined;
}

export function themeLooks(assets: ThemeAssets): ThemeLooks {
  const { theme, sheets } = assets;
  const sheet = (ref: string | undefined): SheetLook | undefined => {
    const loaded = ref === undefined ? undefined : sheets.get(ref);
    return loaded && ref ? { key: `${theme.id}:${ref}`, sheet: loaded } : undefined;
  };
  const effect = (id: string | undefined) => sheet(id && theme.effects.get(id)?.sprite);
  return {
    character(id) {
      const character = theme.characters.get(id);
      const body = sheet(character?.sprite);
      if (!character || !body) return undefined;
      const weapon = sheet(theme.weapons.get(character.weapon)?.sprite);
      return { key: body.key, body: body.sheet, ...(weapon && { weapon }) };
    },
    projectile: (kind) => sheet(theme.projectiles.get(kind)?.sprite),
    effect,
    fireEffect: (weapon) => effect(theme.weapons.get(weapon)?.effects.fire),
    hitEffect: (character) => effect(theme.characters.get(character)?.effects.hit),
    impactEffect: (projectile) => effect(theme.projectiles.get(projectile)?.effects.impact),
  };
}
