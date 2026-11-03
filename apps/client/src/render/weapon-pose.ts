// Where and how the weapon is drawn on a character (ARCHITECTURE §10). Pure math, no PixiJS.
import type { DirectionView, SpriteSheet } from '@pixel-shoot/content';
import { originOf, slicePoint } from '@pixel-shoot/content';

export interface WeaponPose {
  /** Weapon grip position relative to the character's ground point, in game pixels. */
  readonly x: number;
  readonly y: number;
  /** Rotation in radians (the aim angle). */
  readonly rotation: number;
  /** Flip the weapon vertically so it is never drawn upside down when aiming left. */
  readonly flipY: boolean;
  readonly behind: boolean;
}

/**
 * Points are pixel corners. Mirroring happens around the ground point, so the 1-pixel "hand"
 * at column x lands at column 2·origin − x − 1.
 */
export function weaponPose(
  character: SpriteSheet,
  frame: number,
  view: DirectionView,
  aimAngle: number,
): WeaponPose {
  const origin = originOf(character, frame);
  const hand = slicePoint(character, 'hand', frame) ?? origin;
  const dx = hand.x - origin.x;
  return {
    x: view.mirrored ? -dx - 1 : dx,
    y: hand.y - origin.y,
    rotation: aimAngle,
    flipY: Math.cos(aimAngle) < 0,
    behind: view.weaponBehind,
  };
}

/** Anchor of a sprite in [0, 1] from a point in frame pixels. */
export function anchorOf(
  sheet: SpriteSheet,
  point: { x: number; y: number },
): { x: number; y: number } {
  return { x: point.x / sheet.frameWidth, y: point.y / sheet.frameHeight };
}
