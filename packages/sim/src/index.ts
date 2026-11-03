// Public entry point. Only what is exported here may be imported by other packages.
export { createBehaviorRegistry } from './behaviors/registry';
export type { BehaviorDefinition, BehaviorKind, BehaviorRegistry } from './behaviors/registry';
export { builtInBehaviors } from './behaviors/built-in';
export { firearm, firearmParams } from './behaviors/weapons/firearm';
export type { FirearmParams } from './behaviors/weapons/firearm';
