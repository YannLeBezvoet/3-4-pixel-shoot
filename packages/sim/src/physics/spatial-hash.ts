// Uniform spatial hash for entity queries (decision 0010): which circles are near a point or
// inside a rectangle. Rebuilt when positions change; results are sorted by entity id so that
// every query is deterministic.
import type { EntityId } from '../core/entities';

export class SpatialHash {
  readonly #cells = new Map<number, EntityId[]>();
  readonly #cellSize: number;

  constructor(cellSize: number) {
    this.#cellSize = cellSize;
  }

  #key(cellX: number, cellY: number): number {
    // Maps never exceed 2^15 cells per side, so this key is unique.
    return (cellY + 0x8000) * 0x10000 + (cellX + 0x8000);
  }

  clear(): void {
    this.#cells.clear();
  }

  /** Adds a circle to every cell its bounding box touches. */
  insert(id: EntityId, x: number, y: number, radius: number): void {
    const size = this.#cellSize;
    for (let cy = Math.floor((y - radius) / size); cy <= Math.floor((y + radius) / size); cy++)
      for (let cx = Math.floor((x - radius) / size); cx <= Math.floor((x + radius) / size); cx++) {
        const key = this.#key(cx, cy);
        const cell = this.#cells.get(key);
        if (cell) cell.push(id);
        else this.#cells.set(key, [id]);
      }
  }

  /** Entities whose cells touch the rectangle, each once, by increasing id. */
  query(left: number, top: number, right: number, bottom: number): EntityId[] {
    const size = this.#cellSize;
    const found = new Set<EntityId>();
    for (let cy = Math.floor(top / size); cy <= Math.floor(bottom / size); cy++)
      for (let cx = Math.floor(left / size); cx <= Math.floor(right / size); cx++)
        for (const id of this.#cells.get(this.#key(cx, cy)) ?? []) found.add(id);
    return [...found].sort((a, b) => a - b);
  }
}
