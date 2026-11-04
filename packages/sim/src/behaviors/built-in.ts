import { bullet } from './projectiles/bullet';
import { grenade } from './projectiles/grenade';
import { createBehaviorRegistry } from './registry';
import type { BehaviorDefinition } from './registry';
import { firearm } from './weapons/firearm';
import { thrown } from './weapons/thrown';

/** Every behavior the engine ships with. */
export const builtInBehaviors = createBehaviorRegistry([
  firearm as BehaviorDefinition,
  thrown as BehaviorDefinition,
  bullet as BehaviorDefinition,
  grenade as BehaviorDefinition,
]);
