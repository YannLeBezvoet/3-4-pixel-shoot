// The systems run by each step, in the order of ARCHITECTURE §5. Systems arrive with the
// milestone tasks that need them; the order of the list is the order of the documentation.
import { vec2 } from '@pixel-shoot/shared';
import type { EntityId } from '../core/entities';
import type { InputCommand } from '../core/input';
import { sanitizeInput } from '../core/input';
import { projectiles, weapons } from '../systems/combat';
import { damage } from '../systems/damage';
import { explosions } from '../systems/explosions';
import { movement } from '../systems/movement';
import type { WorldState } from './state';

export type System = (world: WorldState) => void;

/**
 * 1. Apply inputs. An actor without input this tick, or dead, stands still, holds no button
 * and keeps its aim. While the world is frozen, actors only aim.
 */
export function applyInputs(world: WorldState, inputs: ReadonlyMap<EntityId, InputCommand>): void {
  for (const [id, actor] of world.actor.entries()) {
    const input = actor.alive ? inputs.get(id) : undefined;
    const clean = input ? sanitizeInput(input) : undefined;
    actor.input =
      clean && !world.frozen
        ? clean
        : { move: vec2.ZERO, aim: clean?.aim ?? actor.aim, buttons: 0 };
    actor.aim = actor.input.aim;
  }
}

/**
 * Systems 3 to 8, in order. Steps 2 and 9 (mode pre-tick and post-tick) are run by the match
 * host around `step`, and step 10 (cleanup) by the systems themselves as they remove entities.
 */
export const SYSTEMS: readonly System[] = [movement, weapons, projectiles, explosions, damage];
