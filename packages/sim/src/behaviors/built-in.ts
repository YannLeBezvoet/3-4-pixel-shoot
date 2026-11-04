import { bullet } from './projectiles/bullet';
import { flame } from './projectiles/flame';
import { grenade } from './projectiles/grenade';
import { createBehaviorRegistry } from './registry';
import type { BehaviorDefinition } from './registry';
import { firearm } from './weapons/firearm';
import { flamethrower } from './weapons/flamethrower';
import { thrown } from './weapons/thrown';

/** Every behavior the engine ships with. */
export const builtInBehaviors = createBehaviorRegistry([
  firearm as BehaviorDefinition,
  flamethrower as BehaviorDefinition,
  thrown as BehaviorDefinition,
  bullet as BehaviorDefinition,
  grenade as BehaviorDefinition,
  flame as BehaviorDefinition,
]);
