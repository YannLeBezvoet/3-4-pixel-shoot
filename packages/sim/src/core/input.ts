// What drives an actor for one tick. Keyboards, bots and network clients all produce this
// same structure, so every actor follows the same rules (decision 0002).
import type { Vec2 } from '@pixel-shoot/shared';
import { normalizeAngle, vec2 } from '@pixel-shoot/shared';

/** Buttons held during a tick, combined as bits. */
export const Button = {
  fire: 1,
  reload: 2,
  throw: 4,
} as const;

const ALL_BUTTONS = Button.fire | Button.reload | Button.throw;

export interface InputCommand {
  /** Desired movement direction; length 0 (stand still) to 1 (full speed). */
  readonly move: Vec2;
  /** Aim angle in radians, screen convention: 0 = east, π/2 = south. */
  readonly aim: number;
  /**
   * Distance to the point aimed at, in world units, from the hands: where a thrown weapon goes.
   * Aim and distance together are the cursor (Q30).
   */
  readonly aimDistance: number;
  /** `Button` bits. */
  readonly buttons: number;
}

/** No movement, no button, aiming east. */
export const NEUTRAL_INPUT: InputCommand = { move: vec2.ZERO, aim: 0, aimDistance: 0, buttons: 0 };

export function hasButton(input: InputCommand, button: number): boolean {
  return (input.buttons & button) !== 0;
}

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

/**
 * Brings any input into the valid range: movement no longer than 1, finite values, aim in
 * (-π, π], unknown buttons dropped. Input from outside the simulation always goes through it.
 */
export function sanitizeInput(input: InputCommand): InputCommand {
  let move = { x: finite(input.move.x), y: finite(input.move.y) };
  if (vec2.length(move) > 1) move = vec2.normalize(move);
  return {
    move,
    aim: normalizeAngle(finite(input.aim)),
    aimDistance: Math.max(0, finite(input.aimDistance)),
    buttons: (Number.isInteger(input.buttons) ? input.buttons : 0) & ALL_BUTTONS,
  };
}
