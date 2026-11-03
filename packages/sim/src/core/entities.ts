// The entity-component store (decision 0002): entities are numbers; each component kind
// lives in its own store. Stores iterate in insertion order, which keeps systems deterministic.

export type EntityId = number;

export class ComponentStore<T> {
  readonly #items = new Map<EntityId, T>();

  get(id: EntityId): T | undefined {
    return this.#items.get(id);
  }

  has(id: EntityId): boolean {
    return this.#items.has(id);
  }

  set(id: EntityId, component: T): void {
    this.#items.set(id, component);
  }

  delete(id: EntityId): void {
    this.#items.delete(id);
  }

  get size(): number {
    return this.#items.size;
  }

  /** Entries in insertion order. */
  entries(): IterableIterator<[EntityId, T]> {
    return this.#items.entries();
  }

  ids(): IterableIterator<EntityId> {
    return this.#items.keys();
  }
}
