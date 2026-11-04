// Placeholder jungle tileset (48×48 tiles, 8 columns), a 2×3-tile tree and sandbags. The tree and
// the sandbags are tile objects: drawn on a transparent background, placed over any ground.
import { createRng } from '@pixel-shoot/shared';
import { Canvas } from '../canvas';
import type { Color, ColorPicker } from '../canvas';

const T = 48;

function noise(
  c: Canvas,
  ox: number,
  oy: number,
  base: Color,
  speckles: Color[],
  seed: string,
  density = 0.12,
) {
  const rng = createRng(seed);
  c.rect(ox, oy, T, T, base);
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) if (rng.chance(density)) c.set(ox + x, oy + y, rng.pick(speckles));
}

/** Tile order, left to right then top to bottom. Documented for the map milestone. */
export const GROUND_TILES = [
  'grass',
  'grass-flowers',
  'dirt',
  'path',
  'water',
  'rice-paddy',
  'mud',
  'burnt-ground',
  'stone-wall-top',
  'stone-wall-front',
  // Formerly sandbags, now a tile object (drawSandbags); left empty so later tile ids keep their place.
  'free',
  'bamboo-wall',
  'bamboo-wall-destroyed',
  'crate',
  'fence',
  'rubble',
  'bridge',
  'ford',
  'thatch-roof',
  'thatch-roof-edge',
  'hut-floor',
  'jungle-floor',
  'tall-grass',
  'rock',
] as const;

export type GroundTile = (typeof GROUND_TILES)[number];

/** Columns of the ground tileset image. */
export const GROUND_COLUMNS = 8;

export function drawGroundTileset(p: ColorPicker): Canvas {
  const c = new Canvas(GROUND_COLUMNS * T, Math.ceil(GROUND_TILES.length / GROUND_COLUMNS) * T);
  const at = (name: GroundTile) => {
    const i = GROUND_TILES.indexOf(name);
    return [(i % GROUND_COLUMNS) * T, Math.floor(i / GROUND_COLUMNS) * T] as const;
  };
  const grass = p.hex('239063');
  const grassDark = p.hex('165a4c');
  const grassLight = p.hex('1ebc73');
  const dirt = p.hex('9e4539');
  const outline = p.hex('2e222f');

  noise(c, ...at('grass'), grass, [grassDark, grassLight], 'grass');
  noise(
    c,
    ...at('grass-flowers'),
    grass,
    [grassDark, grassLight, p.hex('f9c22b'), p.hex('eaaded')],
    'flowers',
    0.08,
  );
  noise(c, ...at('dirt'), dirt, [p.hex('7a3045'), p.hex('cd683d')], 'dirt');
  noise(c, ...at('path'), p.hex('ab947a'), [p.hex('966c6c'), p.hex('c7dcd0')], 'path');
  noise(c, ...at('water'), p.hex('4d65b4'), [p.hex('4d9be6'), p.hex('8fd3ff')], 'water', 0.06);
  {
    const [x, y] = at('rice-paddy');
    noise(c, x, y, p.hex('4d9be6'), [p.hex('8fd3ff')], 'paddy', 0.05);
    for (let j = 4; j < T; j += 8)
      for (let i = 3; i < T; i += 6) c.rect(x + i, y + j, 1, 3, grassLight);
  }
  noise(c, ...at('mud'), p.hex('694f62'), [p.hex('45293f'), dirt], 'mud');
  noise(
    c,
    ...at('burnt-ground'),
    p.hex('3e3546'),
    [p.hex('2e222f'), p.hex('625565'), p.hex('fb6b1d')],
    'burnt',
    0.1,
  );
  {
    const [x, y] = at('stone-wall-top');
    noise(c, x, y, p.hex('9babb2'), [p.hex('7f708a'), p.hex('c7dcd0')], 'wall-top');
  }
  {
    const [x, y] = at('stone-wall-front');
    c.rect(x, y, T, T, p.hex('7f708a'));
    for (let row = 0; row < 4; row++) {
      c.rect(x, y + row * 12 + 11, T, 1, p.hex('625565'));
      for (let col = 0; col < 3; col++)
        c.rect(x + ((col * 16 + (row % 2) * 8) % T), y + row * 12, 1, 11, p.hex('625565'));
    }
  }
  {
    const [x, y] = at('bamboo-wall');
    for (let i = 0; i < T; i += 6) {
      c.rect(x + i, y, 5, T, p.hex('e6904e'));
      c.rect(x + i, y, 1, T, p.hex('cd683d'));
      for (let j = 7; j < T; j += 14) c.rect(x + i, y + j, 5, 1, p.hex('9e4539'));
    }
  }
  {
    const [x, y] = at('bamboo-wall-destroyed');
    noise(c, x, y, dirt, [p.hex('7a3045')], 'bamboo-ground');
    const rng = createRng('bamboo-broken');
    for (let i = 0; i < 9; i++) {
      const sx = x + rng.int(2, 40);
      const sy = y + rng.int(4, 40);
      c.line(sx, sy, sx + rng.int(-6, 6), sy + rng.int(2, 7), p.hex('e6904e'));
    }
  }
  {
    const [x, y] = at('crate');
    noise(c, x, y, dirt, [p.hex('7a3045')], 'crate-ground');
    c.rect(x + 6, y + 6, 36, 36, p.hex('cd683d'));
    c.rect(x + 6, y + 6, 36, 8, p.hex('e6904e'));
    c.line(x + 6, y + 14, x + 41, y + 41, p.hex('9e4539'));
    c.line(x + 41, y + 14, x + 6, y + 41, p.hex('9e4539'));
    c.rect(x + 6, y + 14, 36, 1, outline);
  }
  {
    const [x, y] = at('fence');
    noise(c, x, y, grass, [grassDark], 'fence-ground');
    for (let i = 4; i < T; i += 12) c.rect(x + i, y + 14, 4, 26, p.hex('9e4539'));
    c.rect(x, y + 20, T, 3, p.hex('cd683d'));
    c.rect(x, y + 30, T, 3, p.hex('cd683d'));
  }
  noise(
    c,
    ...at('rubble'),
    dirt,
    [p.hex('7f708a'), p.hex('9babb2'), p.hex('625565')],
    'rubble',
    0.25,
  );
  {
    // Planks laid across a river flowing north-south, with rails along the edges.
    const [x, y] = at('bridge');
    c.rect(x, y, T, T, p.hex('9e4539'));
    for (let i = 0; i < T; i += 8) {
      c.rect(x + i, y, 7, T, p.hex('cd683d'));
      c.rect(x + i + 7, y, 1, T, p.hex('7a3045'));
    }
    c.rect(x, y, T, 3, p.hex('694f62'));
    c.rect(x, y + T - 3, T, 3, p.hex('694f62'));
  }
  {
    const [x, y] = at('ford');
    noise(c, x, y, p.hex('4d9be6'), [p.hex('8fd3ff')], 'ford', 0.08);
    const rng = createRng('ford-stones');
    for (let i = 0; i < 7; i++)
      c.ellipse(x + rng.int(5, 42), y + rng.int(5, 42), rng.int(2, 4), 2, p.hex('9babb2'));
  }
  for (const name of ['thatch-roof', 'thatch-roof-edge'] as const) {
    const [x, y] = at(name);
    c.rect(x, y, T, T, p.hex('e6904e'));
    const rng = createRng(name);
    for (let i = 0; i < 70; i++) {
      const sx = x + rng.int(0, T - 1);
      const sy = y + rng.int(0, T - 6);
      c.line(sx, sy, sx + rng.int(-1, 1), sy + 5, rng.pick([p.hex('f9c22b'), p.hex('cd683d')]));
    }
    if (name === 'thatch-roof-edge') {
      c.rect(x, y + T - 8, T, 8, p.hex('9e4539'));
      for (let i = 0; i < T; i += 3) c.rect(x + i, y + T - 8, 1, 8, p.hex('7a3045'));
    }
  }
  noise(c, ...at('hut-floor'), p.hex('ab947a'), [p.hex('966c6c'), p.hex('c7dcd0')], 'hut-floor');
  noise(c, ...at('jungle-floor'), grassDark, [p.hex('374e4a'), grass], 'jungle-floor', 0.2);
  {
    const [x, y] = at('tall-grass');
    noise(c, x, y, grass, [grassDark], 'tall-grass-ground');
    const rng = createRng('tall-grass');
    for (let i = 0; i < 40; i++) {
      const bx = x + rng.int(1, 46);
      const by = y + rng.int(6, 46);
      c.line(
        bx,
        by,
        bx + rng.int(-2, 2),
        by - rng.int(4, 7),
        rng.pick([grassLight, p.hex('91db69')]),
      );
    }
  }
  {
    const [x, y] = at('rock');
    noise(c, x, y, grass, [grassDark, grassLight], 'rock-ground');
    c.ellipse(x + 24, y + 27, 18, 14, p.hex('7f708a'));
    c.ellipse(x + 20, y + 22, 11, 8, p.hex('9babb2'));
    c.ellipse(x + 17, y + 19, 4, 3, p.hex('c7dcd0'));
    c.ellipse(x + 24, y + 38, 15, 3, p.hex('625565'), (_x, yy) => yy >= y + 38);
  }
  return c;
}

/** Trunk collision of the jungle tree, in its 96×144 picture: a box around the base. */
export const TREE_TRUNK = { x: 40, y: 128, width: 16, height: 14 } as const;

/** A jungle tree two tiles wide and three tall; its trunk base is the bottom-center. */
export function drawJungleTree(p: ColorPicker): Canvas {
  const c = new Canvas(2 * T, 3 * T);
  const rng = createRng('tree');
  c.rect(42, 92, 12, 50, p.hex('694f62'));
  c.rect(42, 92, 3, 50, p.hex('45293f'));
  c.ellipse(48, 141, 14, 2, p.hex('45293f'));
  const leaves = [p.hex('165a4c'), p.hex('239063'), p.hex('1ebc73'), p.hex('91db69')];
  c.ellipse(48, 60, 46, 44, leaves[0] as Color);
  for (let i = 0; i < 40; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(0, 30);
    c.ellipse(
      48 + Math.cos(angle) * distance,
      54 + Math.sin(angle) * distance * 0.9,
      rng.int(6, 11),
      rng.int(5, 9),
      rng.pick(leaves.slice(1, 3)),
    );
  }
  for (let i = 0; i < 12; i++)
    c.ellipse(30 + rng.int(0, 36), 30 + rng.int(0, 30), 3, 2, leaves[3] as Color);
  c.outline(p.hex('2e222f'));
  return c;
}

/** Collision of the sandbags: the whole tile, so a line of them leaves no gap. */
export const SANDBAGS_FOOTPRINT = { x: 0, y: 0, width: T, height: T } as const;

/**
 * Sandbags filling one tile on a transparent background. Rows of three bags alternate with rows
 * shifted by half a bag, so tiles placed side by side or one above the other join seamlessly.
 */
export function drawSandbags(p: ColorPicker): Canvas {
  const c = new Canvas(T, T);
  const top = p.hex('ab947a');
  const side = p.hex('966c6c');
  const outline = p.hex('2e222f');
  for (let row = 0; row < 4; row++) {
    const by = 1 + row * 12;
    // Bags cut by the tile's edges are finished by the neighboring tile.
    for (let bx = (row % 2) * -8; bx < T; bx += 16) {
      c.ellipse(bx + 7, by + 5, 7, 5, top);
      c.ellipse(bx + 7, by + 7, 7, 3, side, (_x, yy) => yy >= by + 8);
      c.rect(bx + 1, by + 10, 13, 1, outline);
    }
  }
  c.outline(outline);
  return c;
}

/** Sandbags and what is left of them: burst bags lying flat, with no collision. */
export function drawSandbagTiles(p: ColorPicker): Canvas {
  const c = new Canvas(2 * T, T);
  c.blit(drawSandbags(p), 0, 0);
  c.blit(drawSandbagRubble(p), T, 0);
  return c;
}

/** Burst sandbags spilling sand, on a transparent background. */
export function drawSandbagRubble(p: ColorPicker): Canvas {
  const c = new Canvas(T, T);
  const rng = createRng('sandbag-rubble');
  const sand = [p.hex('ab947a'), p.hex('966c6c')];
  for (let i = 0; i < 7; i++)
    c.ellipse(rng.int(10, 38), rng.int(6, 42), rng.int(4, 7), rng.int(2, 4), rng.pick(sand));
  for (let i = 0; i < 40; i++) c.set(rng.int(6, 42), rng.int(3, 45), sand[0] as (typeof sand)[0]);
  return c;
}

/** Collision of a fuel barrel: its base. */
export const BARREL_FOOTPRINT = { x: 12, y: 24, width: 24, height: 22 } as const;

/** A fuel barrel and the scorched ring it leaves, on a transparent background. */
export function drawFuelBarrel(p: ColorPicker): Canvas {
  const c = new Canvas(2 * T, T);
  const body = p.hex('374e4a');
  const light = p.hex('547e64');
  const band = p.hex('e83b3b');
  const outline = p.hex('2e222f');
  c.ellipse(24, 40, 11, 6, body);
  c.rect(13, 16, 22, 24, body);
  c.rect(13, 16, 4, 24, light);
  c.rect(13, 26, 22, 3, band);
  c.ellipse(24, 16, 11, 5, light);
  c.ellipse(24, 16, 7, 3, body);
  c.outline(outline);

  const ash = [p.hex('2e222f'), p.hex('3e3546'), p.hex('625565')];
  const rng = createRng('barrel-scorch');
  for (let i = 0; i < 90; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(4, 20);
    c.set(
      Math.round(T + 24 + Math.cos(angle) * distance),
      Math.round(32 + Math.sin(angle) * distance * 0.7),
      rng.pick(ash),
    );
  }
  return c;
}
