// Small maps written as text, for the tests of every package (ARCHITECTURE §17).
import type {
  Footprint,
  MapData,
  MapObject,
  SpawnArea,
  TileLayer,
  TileType,
} from '../map/map-data';
import { TILE_SIZE, TileFlag } from '../map/map-data';

/**
 * Builds a map from rows of characters, one per tile:
 *
 * - `.` floor
 * - `#` solid tile (wall)
 * - `~` impassable tile (deep water)
 * - `o` floor with a solid object whose footprint is a 16×16 box centered in the tile
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

  // Tile types: 0 = none, 1 = floor, 2 = solid, 3 = impassable.
  const tileTypes: TileType[] = [
    { flags: 0 },
    { flags: 0 },
    { flags: TileFlag.solid },
    { flags: TileFlag.impassable },
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
      else if (char === '.' || char === 'o' || /[1-9]/.test(char)) cells.push(1);
      else throw new Error(`Unknown map character "${char}" at column ${x}, row ${y}.`);
      if (char === 'o') {
        const footprint: Footprint = {
          x: left + 16,
          y: top + 16,
          width: 16,
          height: 16,
          flags: TileFlag.solid,
        };
        objects.push({
          id: objects.length + 1,
          x: left + TILE_SIZE / 2,
          y: top + 32,
          footprints: [footprint],
        });
      }
      if (/[1-9]/.test(char))
        spawns.push({ team: Number(char), x: left, y: top, width: TILE_SIZE, height: TILE_SIZE });
    });
  });

  const ground: TileLayer = { name: 'ground', role: 'ground', cells };
  return { id, nameKey: `map.${id}`, width, height, tileTypes, layers: [ground], objects, spawns };
}
