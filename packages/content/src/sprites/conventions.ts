// Sprite conventions shared by the validator and the renderer (docs/guides/create-a-sprite.md).
import type { Octant } from '@pixel-shoot/shared';

/** Grid size: every frame side is a multiple of this. */
export const GRID = 48;

/** The 5 directions drawn in Aseprite. Side directions are drawn facing right. */
export const DRAWN_DIRECTIONS = ['down', 'down-side', 'side', 'up-side', 'up'] as const;
export type DrawnDirection = (typeof DRAWN_DIRECTIONS)[number];

export interface DirectionView {
  readonly drawn: DrawnDirection;
  /** Draw the frame flipped horizontally (left-facing directions). */
  readonly mirrored: boolean;
  /** The weapon is drawn behind the body (aiming upward). */
  readonly weaponBehind: boolean;
}

const VIEWS: Record<Octant, DirectionView> = {
  s: { drawn: 'down', mirrored: false, weaponBehind: false },
  se: { drawn: 'down-side', mirrored: false, weaponBehind: false },
  e: { drawn: 'side', mirrored: false, weaponBehind: false },
  ne: { drawn: 'up-side', mirrored: false, weaponBehind: true },
  n: { drawn: 'up', mirrored: false, weaponBehind: true },
  nw: { drawn: 'up-side', mirrored: true, weaponBehind: true },
  w: { drawn: 'side', mirrored: true, weaponBehind: false },
  sw: { drawn: 'down-side', mirrored: true, weaponBehind: false },
};

/** How a character facing an on-screen direction is drawn (ARCHITECTURE §10). */
export function viewForOctant(octant: Octant): DirectionView {
  return VIEWS[octant];
}

/** Tag name of a directional animation, e.g. tagName('walk', 'down-side') = 'walk.down-side'. */
export function tagName(action: string, direction?: DrawnDirection): string {
  return direction ? `${action}.${direction}` : action;
}

export type ParsedTag =
  | { readonly ok: true; readonly action: string; readonly direction?: DrawnDirection }
  | { readonly ok: false; readonly message: string };

const ACTION = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Splits "walk.down-side" into its action and direction, explaining what is wrong otherwise. */
export function parseTagName(name: string): ParsedTag {
  const [action = '', direction, ...rest] = name.split('.');
  if (!ACTION.test(action) || rest.length > 0) {
    return {
      ok: false,
      message: `Tag "${name}" is not a valid animation name. Use "<action>" or "<action>.<direction>" with a lowercase action such as "walk" or "throw-grenade".`,
    };
  }
  if (direction === undefined) return { ok: true, action };
  if (!(DRAWN_DIRECTIONS as readonly string[]).includes(direction)) {
    return {
      ok: false,
      message: `Tag "${name}" uses the unknown direction "${direction}". Drawn directions are ${DRAWN_DIRECTIONS.join(', ')}; left-facing directions are mirrored automatically.`,
    };
  }
  return { ok: true, action, direction: direction as DrawnDirection };
}

export interface SpriteRequirements {
  /** What the sprite is, for messages ("character", "weapon"). */
  readonly kind: string;
  /** Actions that must exist in all 5 drawn directions. */
  readonly directionalActions: readonly string[];
  /** Animations without direction that must exist. */
  readonly actions: readonly string[];
  /** Slices that must exist, with what they are for. */
  readonly slices: Readonly<Record<string, string>>;
}

export const CHARACTER_SPRITE: SpriteRequirements = {
  kind: 'character',
  directionalActions: ['idle', 'walk', 'death'],
  actions: [],
  slices: { hand: 'the point where the weapon grip attaches' },
};

export const WEAPON_SPRITE: SpriteRequirements = {
  kind: 'weapon',
  directionalActions: [],
  actions: [],
  slices: {
    grip: 'the point the weapon rotates around and holds in the hand',
    muzzle: 'the point where projectiles and muzzle flashes start',
  },
};

export const PROJECTILE_SPRITE: SpriteRequirements = {
  kind: 'projectile',
  directionalActions: [],
  actions: ['fly'],
  slices: { origin: 'the projectile position: the sprite is drawn there and rotates around it' },
};

export const EFFECT_SPRITE: SpriteRequirements = {
  kind: 'effect',
  directionalActions: [],
  actions: ['play'],
  slices: {},
};
