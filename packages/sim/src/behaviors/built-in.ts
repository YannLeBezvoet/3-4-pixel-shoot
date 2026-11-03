import { bullet } from './projectiles/bullet';
import { createBehaviorRegistry } from './registry';
import type { BehaviorDefinition } from './registry';
import { firearm } from './weapons/firearm';

/** Every behavior the engine ships with. */
export const builtInBehaviors = createBehaviorRegistry([
  firearm as BehaviorDefinition,
  bullet as BehaviorDefinition,
]);
