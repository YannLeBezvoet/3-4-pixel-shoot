// Behaviors are engine code (weapon, projectile and map-element types). Themes pick a
// behavior by id and give parameters, which are validated against the behavior's schema.
import type { z } from 'zod';

export type BehaviorKind = 'weapon' | 'projectile' | 'map-element';

export interface BehaviorDefinition<Params = unknown> {
  readonly kind: BehaviorKind;
  /** Identifier used in theme files, e.g. "firearm". */
  readonly id: string;
  /** Developer documentation, used by the generated behavior reference. Never shown in game. */
  readonly description: string;
  /** Schema of the parameters a theme gives this behavior. */
  readonly params: z.ZodType<Params>;
}

export interface BehaviorRegistry {
  get(kind: BehaviorKind, id: string): BehaviorDefinition | undefined;
  list(kind: BehaviorKind): readonly BehaviorDefinition[];
}

export function createBehaviorRegistry(
  definitions: readonly BehaviorDefinition[],
): BehaviorRegistry {
  const byKey = new Map<string, BehaviorDefinition>();
  for (const definition of definitions) {
    const key = `${definition.kind}:${definition.id}`;
    if (byKey.has(key))
      throw new Error(`Behavior "${definition.id}" (${definition.kind}) is registered twice.`);
    byKey.set(key, definition);
  }
  return {
    get: (kind, id) => byKey.get(`${kind}:${id}`),
    list: (kind) => definitions.filter((definition) => definition.kind === kind),
  };
}
