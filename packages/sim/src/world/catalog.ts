// The gameplay content a simulation runs with, already validated and converted to engine
// units. `content` builds it from a theme; tests build it by hand.

export interface CharacterStats {
  readonly id: string;
  /** Top speed, in world units per second. */
  readonly speed: number;
  /** Radius of the collider circle around the ground point, in world units. */
  readonly radius: number;
  readonly hitPoints: number;
}

export interface Catalog {
  readonly characters: ReadonlyMap<string, CharacterStats>;
}

/** Builds a catalog from lists, for tests and tools. */
export function createCatalog(content: { characters: readonly CharacterStats[] }): Catalog {
  return { characters: new Map(content.characters.map((c) => [c.id, c])) };
}
