// Map elements (Q33): the tiles and objects of the map that can change during a round. They are
// built from the map's properties; what happens to them is decided by the map element system
// (systems/map-elements.ts). The map itself never changes: its tiles are copied here, and the
// collision grid follows.
import type { MutableCollisionGrid } from '../map/collision-grid';
import { tileOf } from '../map/collision-grid';
import type { Box, ElementBlast, ElementProperties, MapData, MapObject } from '../map/map-data';
import { ANY_DAMAGE, TILE_SIZE } from '../map/map-data';
import type { SegmentHit } from '../physics/raycast';
import type { FireOrigin } from './state';

export interface MapElement {
  /** Stable id: a tile's index in the map, or the number of tiles + the object's index. */
  readonly key: number;
  /** The map object, or undefined for a tile. */
  readonly object: MapObject | undefined;
  /** The tile, or the tile of an object's ground point. */
  readonly tileX: number;
  readonly tileY: number;
  /** What it covers, in world units. */
  readonly box: Box;
  /** Indices of the tiles it touches. */
  readonly tiles: readonly number[];
  /** Hit points left; undefined means damage cannot destroy it. */
  hp: number | undefined;
  /** `DamageFilter` bits of what hurts it. */
  readonly damageFilter: number;
  readonly explosive: ElementBlast | undefined;
  readonly flammable: boolean;
  /** Ticks before it burns out; 0 when it is not on fire. */
  burning: number;
  /** Ticks before it may next spread its fire. */
  spreadIn: number;
  /** Who set it on fire. */
  fire: FireOrigin | undefined;
}

/** A read-only copy of an element's state. */
export interface ElementState {
  readonly key: number;
  /** Id of the map object, or undefined for a tile. */
  readonly object: number | undefined;
  readonly tileX: number;
  readonly tileY: number;
  readonly hp: number | undefined;
  /** Ticks before it burns out; 0 when it is not on fire. */
  readonly burning: number;
}

/** The smallest box around an object's footprints, or its tile without any. */
function objectBox(object: MapObject): Box {
  const [first, ...others] = object.footprints;
  if (!first)
    return {
      x: tileOf(object.x) * TILE_SIZE,
      y: tileOf(object.y) * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    };
  let left = first.x;
  let top = first.y;
  let right = first.x + first.width;
  let bottom = first.y + first.height;
  for (const f of others) {
    left = Math.min(left, f.x);
    top = Math.min(top, f.y);
    right = Math.max(right, f.x + f.width);
    bottom = Math.max(bottom, f.y + f.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export class MapElements {
  readonly #map: MapData;
  readonly #grid: MutableCollisionGrid;
  /** Current tiles of each layer, in the order of `MapData.layers`. */
  #tiles: number[][] = [];
  readonly #elements = new Map<number, MapElement>();
  /** Elements touching each tile, by tile index. */
  readonly #byTile = new Map<number, MapElement[]>();
  readonly #byObject = new Map<number, MapElement>();
  /** Elements on fire, in the order they caught it. */
  readonly #burning = new Map<number, MapElement>();
  /** Whether anything changed since the map was built. */
  #changed = false;

  constructor(map: MapData, grid: MutableCollisionGrid) {
    this.#map = map;
    this.#grid = grid;
    this.#build();
  }

  #build(): void {
    const map = this.#map;
    this.#tiles = map.layers.map((layer) => [...layer.cells]);
    this.#elements.clear();
    this.#byTile.clear();
    this.#byObject.clear();
    this.#burning.clear();
    for (let index = 0; index < map.width * map.height; index++) this.#addTile(index);
    map.objects.forEach((object, index) => this.#addObject(object, index));
  }

  #addTile(index: number): MapElement | undefined {
    const properties = this.#tileProperties(index);
    if (!properties) return undefined;
    const tileX = index % this.#map.width;
    const tileY = Math.floor(index / this.#map.width);
    const element: MapElement = {
      key: index,
      object: undefined,
      tileX,
      tileY,
      box: { x: tileX * TILE_SIZE, y: tileY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE },
      tiles: [index],
      hp: properties.hp,
      damageFilter: properties.damageFilter ?? ANY_DAMAGE,
      explosive: properties.explosive,
      flammable: properties.flammable ?? false,
      burning: 0,
      spreadIn: 0,
      fire: undefined,
    };
    this.#elements.set(element.key, element);
    this.#touch(element, index);
    return element;
  }

  #addObject(object: MapObject, index: number): void {
    if (!object.element) return;
    const box = objectBox(object);
    const { width, height } = this.#map;
    const tiles: number[] = [];
    for (let ty = tileOf(box.y); ty <= tileOf(box.y + box.height - 1e-9); ty++)
      for (let tx = tileOf(box.x); tx <= tileOf(box.x + box.width - 1e-9); tx++)
        if (tx >= 0 && ty >= 0 && tx < width && ty < height) tiles.push(ty * width + tx);
    const element: MapElement = {
      key: width * height + index,
      object,
      tileX: tileOf(object.x),
      tileY: tileOf(object.y - 1e-9),
      box,
      tiles,
      hp: object.element.hp,
      damageFilter: object.element.damageFilter ?? ANY_DAMAGE,
      explosive: object.element.explosive,
      flammable: object.element.flammable ?? false,
      burning: 0,
      spreadIn: 0,
      fire: undefined,
    };
    this.#elements.set(element.key, element);
    this.#byObject.set(object.id, element);
    for (const tile of tiles) this.#touch(element, tile);
  }

  #touch(element: MapElement, index: number): void {
    const list = this.#byTile.get(index);
    if (list) list.push(element);
    else this.#byTile.set(index, [element]);
  }

  /**
   * What makes this tile an element. Hit points and blast come from the topmost ground layer
   * that has them; any layer can make it flammable, a thatch roof over a floor for instance.
   */
  #tileProperties(index: number): ElementProperties | undefined {
    const { layers, tileTypes } = this.#map;
    let solidPart: ElementProperties | undefined;
    let flammable = false;
    for (let layer = layers.length - 1; layer >= 0; layer--) {
      const properties = tileTypes[this.#tiles[layer]?.[index] ?? 0]?.element;
      if (!properties) continue;
      if (properties.flammable) flammable = true;
      if (layers[layer]?.role === 'ground' && properties.hp !== undefined) solidPart ??= properties;
    }
    if (!solidPart && !flammable) return undefined;
    return { ...solidPart, flammable };
  }

  /** The element a cast stopped at, if it is one. */
  at(hit: SegmentHit): MapElement | undefined {
    const object = hit.footprint?.object;
    if (hit.footprint) return object === undefined ? undefined : this.#byObject.get(object);
    return this.#elements.get(hit.tileY * this.#map.width + hit.tileX);
  }

  get(key: number): MapElement | undefined {
    return this.#elements.get(key);
  }

  /** The element of a map object, as long as the object stands. */
  ofObject(id: number): MapElement | undefined {
    return this.#byObject.get(id);
  }

  /** Elements touching a square around a point, each once, in tile order. */
  near(x: number, y: number, radius: number): MapElement[] {
    const { width, height } = this.#map;
    const found = new Set<MapElement>();
    const left = Math.max(0, tileOf(x - radius));
    const right = Math.min(width - 1, tileOf(x + radius));
    for (let ty = Math.max(0, tileOf(y - radius)); ty <= tileOf(y + radius) && ty < height; ty++)
      for (let tx = left; tx <= right; tx++)
        for (const element of this.#byTile.get(ty * width + tx) ?? []) found.add(element);
    return [...found];
  }

  /** Elements whose box contains a point. */
  atPoint(x: number, y: number): MapElement[] {
    const { width, height } = this.#map;
    const tileX = tileOf(x);
    const tileY = tileOf(y);
    if (tileX < 0 || tileY < 0 || tileX >= width || tileY >= height) return [];
    return (this.#byTile.get(tileY * width + tileX) ?? []).filter(
      ({ box }) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height,
    );
  }

  /** Elements touching the tiles of this one or the tiles next to them, itself excepted. */
  neighbors(element: MapElement): MapElement[] {
    const { width, height } = this.#map;
    const found = new Set<MapElement>();
    for (const tile of element.tiles) {
      const x = tile % width;
      const y = Math.floor(tile / width);
      for (const [nx, ny] of [
        [x, y],
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        for (const other of this.#byTile.get(ny * width + nx) ?? []) found.add(other);
      }
    }
    found.delete(element);
    return [...found];
  }

  /** The elements on fire, as they stand now: fires starting meanwhile are not in it. */
  burning(): MapElement[] {
    return [...this.#burning.values()];
  }

  /**
   * Sets an element on fire, for `burnTicks` ticks. Returns whether it caught fire. One that has
   * just burnt out stays in the fires until step 8 consumes it: it does not catch again.
   */
  ignite(element: MapElement, burnTicks: number, spreadIn: number, fire: FireOrigin): boolean {
    if (!element.flammable || this.#burning.has(element.key)) return false;
    element.burning = burnTicks;
    element.spreadIn = spreadIn;
    element.fire = fire;
    this.#burning.set(element.key, element);
    this.#changed = true;
    return true;
  }

  /** Puts a fire out. */
  extinguish(element: MapElement): void {
    element.burning = 0;
    this.#burning.delete(element.key);
  }

  /** Replaces a tile of a layer and updates its collision flags. */
  setTile(layer: number, tileX: number, tileY: number, tile: number): void {
    const { width, layers, tileTypes } = this.#map;
    const index = tileY * width + tileX;
    const cells = this.#tiles[layer];
    if (cells) cells[index] = tile;
    let flags = 0;
    layers.forEach((l, i) => {
      if (l.role === 'ground') flags |= tileTypes[this.#tiles[i]?.[index] ?? 0]?.flags ?? 0;
    });
    this.#grid.setFlags(tileX, tileY, flags);
    this.#changed = true;
  }

  /** The tile kind in a layer, by tile index. */
  tileIn(layer: number, index: number): number {
    return this.#tiles[layer]?.[index] ?? 0;
  }

  #forget(element: MapElement): void {
    this.#elements.delete(element.key);
    this.#burning.delete(element.key);
    for (const [index, list] of this.#byTile) {
      if (!list.includes(element)) continue;
      const left = list.filter((e) => e !== element);
      if (left.length > 0) this.#byTile.set(index, left);
      else this.#byTile.delete(index);
    }
    if (element.object) this.#byObject.delete(element.object.id);
    this.#changed = true;
  }

  /** Removes an object, its collision included. */
  removeObject(element: MapElement): void {
    if (element.object) this.#grid.removeObject(element.object.id);
    this.#forget(element);
  }

  /** Reads a tile element again from its current tiles: it may be gone or be another one. */
  refreshTile(element: MapElement): void {
    this.#forget(element);
    const next = this.#addTile(element.key);
    // What stands there after a roof burnt off keeps the damage it took.
    if (next?.hp !== undefined && element.hp) next.hp = Math.min(next.hp, element.hp);
  }

  /** Restores the map as it was built. Returns whether anything had changed. */
  reset(): boolean {
    if (!this.#changed) return false;
    this.#grid.reset();
    this.#build();
    this.#changed = false;
    return true;
  }

  /** Elements still standing, by key, for hashing and tests. */
  snapshot(): ElementState[] {
    return [...this.#elements.values()]
      .sort((a, b) => a.key - b.key)
      .map(({ key, object, tileX, tileY, hp, burning }) => ({
        key,
        object: object?.id,
        tileX,
        tileY,
        hp,
        burning,
      }));
  }
}
