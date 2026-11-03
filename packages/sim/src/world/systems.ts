// The systems run by each step, in the order of ARCHITECTURE §5. Systems arrive with the
// milestone tasks that need them; the order of the list is the order of the documentation.
import { vec2 } from '@pixel-shoot/shared';
import type { EntityId } from '../core/entities';
import type { InputCommand } from '../core/input';
import { sanitizeInput } from '../core/input';
import { projectiles, weapons } from '../systems/combat';
import { movement } from '../systems/movement';
import type { WorldState } from './state';

export type System = (world: WorldState) => void;

/**
 * 1. Apply inputs. An actor without input this tick stands still, holds no button and keeps
 * its aim.
 */
export function applyInputs(world: WorldState, inputs: ReadonlyMap<EntityId, InputCommand>): void {
  for (const [id, actor] of world.actor.entries()) {
    const input = inputs.get(id);
    actor.input = input ? sanitizeInput(input) : { move: vec2.ZERO, aim: actor.aim, buttons: 0 };
    actor.aim = actor.input.aim;
  }
}

/** Systems 2 to 10, in order (2, mode pre-tick, arrives with the game-mode API). */
export const SYSTEMS: readonly System[] = [movement, weapons, projectiles];
