// Small maps written as text, for the tests of every package (ARCHITECTURE §17).
import type {
  Footprint,
  MapData,
  MapObject,
  SpawnArea,
  TileLayer,
  TileType,
} from '../map/map-data';
import { DamageFilter, TILE_SIZE, TileFlag } from '../map/map-data';

/**
 * Builds a map from rows of characters, one per tile:
 *
 * - `.` floor
 * - `#` solid tile (wall)
 * - `~` impassable tile (deep water)
 * - `o` floor with a solid object whose footprint is a 16×16 box centered in the tile
 * - `s` floor with sandbags: a cover object filling the tile, which 40 % of bullets pass
 * - `S` the same sandbags with 200 hit points, only hurt by explosions (Q33, Q70)
 * - `w` destructible wall: a solid tile of 60 hit points, leaving rubble
 * - `c` floor with a crate: a solid object of 80 hit points
 * - `x` floor with a fuel barrel: a solid object of 30 hit points, explosive
 * - `1`–`9` floor with a one-tile spawn area for that team
 *
 * Rows may be given as one string; blank lines and surrounding spaces are ignored.
 */
export function asciiMap(rows: string | readonly string[], id = 'ascii'): MapData {
  const lines = (typeof rows === 'string' ? rows.split('\n') : rows)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const height = lines.length;
  const width = lines[0]?.length ?? 0;
  if (width === 0) throw new Error('An ASCII map needs at least one row.');

  // Tile types: 0 = none, 1 = floor, 2 = solid, 3 = impassable, 4 = rubble, 5 = wall.
  const tileTypes: TileType[] = [
    { flags: 0 },
    { flags: 0 },
    { flags: TileFlag.solid },
    { flags: TileFlag.impassable },
    { flags: 0 },
    { flags: TileFlag.solid, element: { hp: 60 }, destroyedTile: 4 },
  ];
  const cells: number[] = [];
  const objects: MapObject[] = [];
  const spawns: SpawnArea[] = [];
  lines.forEach((line, y) => {
    if (line.length !== width)
      throw new Error(`Row ${y} has ${line.length} characters, expected ${width}.`);
    [...line].forEach((char, x) => {
      const left = x * TILE_SIZE;
      const top = y * TILE_SIZE;
      if (char === '#') cells.push(2);
      else if (char === '~') cells.push(3);
      else if (char === 'w') cells.push(5);
      else if (/[.oscSx1-9]/.test(char)) cells.push(1);
      else throw new Error(`Unknown map character "${char}" at column ${x}, row ${y}.`);
      if (char === 'o') {
        const id = objects.length + 1;
        const footprint: Footprint = {
          x: left + 16,
          y: top + 16,
          width: 16,
          height: 16,
          flags: TileFlag.solid,
          object: id,
        };
        objects.push({ id, x: left + TILE_SIZE / 2, y: top + 32, footprints: [footprint] });
      }
      if (char === 's' || char === 'S') {
        const id = objects.length + 1;
        const footprint: Footprint = {
          x: left,
          y: top,
          width: TILE_SIZE,
          height: TILE_SIZE,
          flags: TileFlag.cover,
          object: id,
          bulletPassPercent: 40,
        };
        objects.push({
          id,
          x: left + TILE_SIZE / 2,
          y: top + TILE_SIZE,
          low: true,
          footprints: [footprint],
          ...(char === 'S' && { element: { hp: 200, damageFilter: DamageFilter.explosion } }),
        });
      }
      if (char === 'c' || char === 'x') {
        const id = objects.length + 1;
        const footprint: Footprint = {
          x: left + 8,
          y: top + 8,
          width: 32,
          height: 32,
          flags: TileFlag.solid,
          object: id,
        };
        objects.push({
          id,
          x: left + TILE_SIZE / 2,
          y: top + 40,
          footprints: [footprint],
          element: char === 'c' ? { hp: 80 } : { hp: 30, explosive: { radius: 144, damage: 120 } },
        });
      }
      if (/[1-9]/.test(char))
        spawns.push({ team: Number(char), x: left, y: top, width: TILE_SIZE, height: TILE_SIZE });
    });
  });

  const ground: TileLayer = { name: 'ground', role: 'ground', cells };
  return { id, nameKey: `map.${id}`, width, height, tileTypes, layers: [ground], objects, spawns };
}
