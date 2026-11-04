// The collision world built from a map (decision 0010): one flag set per tile, from the ground
// layers, plus the footprints of map objects indexed by the tiles they touch. Everything outside
// the map is solid, so nothing leaves it. It changes as map elements are destroyed.
import type { Footprint, MapData } from './map-data';
import { TILE_SIZE, TileFlag } from './map-data';

export const OUTSIDE_FLAGS = TileFlag.solid;

export interface CollisionGrid {
  /** Size in tiles. */
  readonly width: number;
  readonly height: number;
  /** Flags of a tile; tiles outside the map are solid. */
  flagsAt(tileX: number, tileY: number): number;
  /** Footprints touching a tile (empty outside the map). */
  footprintsAt(tileX: number, tileY: number): readonly Footprint[];
}

/** What the world may change; the rest of the game sees a `CollisionGrid`. */
export interface MutableCollisionGrid extends CollisionGrid {
  setFlags(tileX: number, tileY: number, flags: number): void;
  /** Removes the footprints of a map object. */
  removeObject(object: number): void;
  /** Back to the map as it was built. */
  reset(): void;
}

/** The tile containing a world coordinate. */
export function tileOf(coordinate: number): number {
  return Math.floor(coordinate / TILE_SIZE);
}

export function buildCollisionGrid(map: MapData): MutableCollisionGrid {
  const { width, height } = map;
  const count = width * height;
  const flags = new Uint8Array(count);
  for (const layer of map.layers) {
    if (layer.role !== 'ground') continue;
    if (layer.cells.length !== count)
      throw new Error(`Layer "${layer.name}" has ${layer.cells.length} cells, expected ${count}.`);
    for (let i = 0; i < count; i++) {
      const type = map.tileTypes[layer.cells[i] as number];
      if (!type) throw new Error(`Layer "${layer.name}" uses unknown tile type ${layer.cells[i]}.`);
      flags[i] = (flags[i] as number) | type.flags;
    }
  }

  const initialFlags = flags.slice();
  let footprints: Footprint[][] = Array.from({ length: count }, () => []);
  for (const object of map.objects) {
    for (const footprint of object.footprints) {
      const x0 = Math.max(0, tileOf(footprint.x));
      const y0 = Math.max(0, tileOf(footprint.y));
      const x1 = Math.min(width - 1, tileOf(footprint.x + footprint.width - 1e-9));
      const y1 = Math.min(height - 1, tileOf(footprint.y + footprint.height - 1e-9));
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++) footprints[ty * width + tx]?.push(footprint);
    }
  }

  const initialFootprints = footprints;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  return {
    width,
    height,
    flagsAt: (x, y) => (inside(x, y) ? (flags[y * width + x] as number) : OUTSIDE_FLAGS),
    footprintsAt: (x, y) => (inside(x, y) ? (footprints[y * width + x] as Footprint[]) : []),
    setFlags(x, y, value) {
      if (inside(x, y)) flags[y * width + x] = value;
    },
    removeObject(object) {
      // A copy, so that `reset` finds the lists as they were built.
      footprints = footprints.map((list) =>
        list.some((f) => f.object === object) ? list.filter((f) => f.object !== object) : list,
      );
    },
    reset() {
      flags.set(initialFlags);
      footprints = initialFootprints;
    },
  };
}
