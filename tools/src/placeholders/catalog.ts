// Every placeholder file, by repository path. Names, tags and slices follow the real-art
// conventions, so replacing a placeholder is a file swap (docs/guides/create-a-sprite.md).
import type { DrawnDirection } from '@pixel-shoot/content';
import { DRAWN_DIRECTIONS } from '@pixel-shoot/content';
import type { Canvas, ColorPicker } from './canvas';
import {
  drawBloodSplat,
  drawBulletImpact,
  drawExplosion,
  drawFlame,
  drawMuzzleFlash,
  drawRifleBullet,
} from './art/effects';
import type { SoldierPose, SoldierStyle } from './art/soldier';
import { drawSoldier } from './art/soldier';
import { drawGroundTileset, drawJungleTree } from './art/tiles';
import { exampleMap } from './art/example-map';
import { groundTileset, treeTileset, vietnamMap } from './art/vietnam-map';
import type { WeaponArt } from './art/weapons';
import { drawAk47, drawM16 } from './art/weapons';
import { SheetBuilder, imageOnly } from './sheet';
import type { SheetOutput } from './sheet';

export interface PlaceholderFile {
  /** Path relative to the repository root. */
  readonly path: string;
  readonly content: Buffer | string;
}

function sheetFiles(path: string, output: SheetOutput): PlaceholderFile[] {
  return [
    { path: `${path}.png`, content: output.png },
    { path: `${path}.json`, content: output.json },
  ];
}

function soldierSheet(name: string, style: SoldierStyle): SheetOutput {
  const sheet = new SheetBuilder(name, 48, 48);
  const animation = (
    action: string,
    poses: { pose: SoldierPose; ms: number }[],
    repeat?: number,
  ) => {
    for (const direction of DRAWN_DIRECTIONS as readonly DrawnDirection[]) {
      const frames = poses.map(({ pose, ms }) => {
        const frame = drawSoldier(style, direction, pose);
        return { canvas: frame.canvas, durationMs: ms, slices: { hand: frame.hand } };
      });
      sheet.addAnimation(`${action}.${direction}`, frames, repeat ? { repeat } : {});
    }
  };
  animation('idle', [
    { pose: { kind: 'stand', legPhase: 0, bob: 0 }, ms: 400 },
    { pose: { kind: 'stand', legPhase: 0, bob: 1 }, ms: 400 },
  ]);
  animation('walk', [
    { pose: { kind: 'stand', legPhase: -1, bob: 0 }, ms: 120 },
    { pose: { kind: 'stand', legPhase: 0, bob: 1 }, ms: 120 },
    { pose: { kind: 'stand', legPhase: 1, bob: 0 }, ms: 120 },
    { pose: { kind: 'stand', legPhase: 0, bob: 1 }, ms: 120 },
  ]);
  animation(
    'death',
    [
      { pose: { kind: 'death', step: 0 }, ms: 100 },
      { pose: { kind: 'death', step: 1 }, ms: 120 },
      { pose: { kind: 'death', step: 2 }, ms: 140 },
      { pose: { kind: 'death', step: 3 }, ms: 1000 },
    ],
    1,
  );
  return sheet.build();
}

function weaponSheet(name: string, art: WeaponArt): SheetOutput {
  const sheet = new SheetBuilder(name, 48, 48);
  sheet.addAnimation('idle', [
    { canvas: art.canvas, durationMs: 100, slices: { grip: art.grip, muzzle: art.muzzle } },
  ]);
  return sheet.build();
}

function projectileSheet(name: string, canvas: Canvas, origin: { x: number; y: number }) {
  const sheet = new SheetBuilder(name, 48, 48);
  sheet.addAnimation('fly', [{ canvas, durationMs: 100, slices: { origin } }]);
  return sheet.build();
}

function effectSheet(
  name: string,
  size: number,
  frames: { canvas: Canvas; ms: number }[],
  origin?: { x: number; y: number },
): SheetOutput {
  const sheet = new SheetBuilder(name, size, size);
  sheet.addAnimation(
    'play',
    frames.map((f) => ({
      canvas: f.canvas,
      durationMs: f.ms,
      ...(origin ? { slices: { origin } } : {}),
    })),
    { repeat: 1 },
  );
  return sheet.build();
}

export function vietnamPlaceholders(p: ColorPicker): PlaceholderFile[] {
  const common = {
    skin: p.hex('fca790'),
    skinShade: p.hex('e6904e'),
    hair: p.hex('45293f'),
    boots: p.hex('3e3546'),
    eye: p.hex('2e222f'),
    marker: p.hex('f9c22b'),
    outline: p.hex('2e222f'),
    blood: p.hex('e83b3b'),
    bloodDark: p.hex('ae2334'),
  };
  const us: SoldierStyle = {
    ...common,
    uniform: p.hex('676633'),
    uniformShade: p.hex('4c3e24'),
    helmet: p.hex('547e64'),
    helmetShade: p.hex('374e4a'),
    helmetShape: 'm1',
    pack: p.hex('694f62'),
  };
  const pavn: SoldierStyle = {
    ...common,
    uniform: p.hex('92a984'),
    uniformShade: p.hex('547e64'),
    helmet: p.hex('b2ba90'),
    helmetShade: p.hex('92a984'),
    helmetShape: 'pith',
    pack: p.hex('676633'),
  };
  const root = 'themes/vietnam';
  return [
    ...sheetFiles(`${root}/sprites/characters/us-rifleman`, soldierSheet('us-rifleman', us)),
    ...sheetFiles(`${root}/sprites/characters/pavn-rifleman`, soldierSheet('pavn-rifleman', pavn)),
    ...sheetFiles(`${root}/sprites/weapons/m16a1`, weaponSheet('m16a1', drawM16(p))),
    ...sheetFiles(`${root}/sprites/weapons/ak47`, weaponSheet('ak47', drawAk47(p))),
    ...sheetFiles(
      `${root}/sprites/effects/muzzle-flash`,
      effectSheet(
        'muzzle-flash',
        48,
        [0, 1].map((s) => ({ canvas: drawMuzzleFlash(p, s as 0 | 1), ms: 40 })),
        { x: 4, y: 24 },
      ),
    ),
    ...sheetFiles(
      `${root}/sprites/effects/blood-splat`,
      effectSheet(
        'blood-splat',
        48,
        [0, 1, 2, 3].map((s) => ({ canvas: drawBloodSplat(p, s), ms: 70 })),
        { x: 24, y: 24 },
      ),
    ),
    ...sheetFiles(
      `${root}/sprites/effects/explosion`,
      effectSheet(
        'explosion',
        96,
        [0, 1, 2, 3, 4, 5].map((s) => ({ canvas: drawExplosion(p, s), ms: 80 })),
        { x: 48, y: 48 },
      ),
    ),
    ...sheetFiles(
      `${root}/sprites/effects/flame`,
      effectSheet(
        'flame',
        48,
        [0, 1, 2, 3].map((s) => ({ canvas: drawFlame(p, s), ms: 90 })),
      ),
    ),
    ...sheetFiles(
      `${root}/sprites/projectiles/rifle-bullet`,
      projectileSheet('rifle-bullet', drawRifleBullet(p), { x: 28, y: 24 }),
    ),
    ...sheetFiles(
      `${root}/sprites/effects/bullet-impact`,
      effectSheet(
        'bullet-impact',
        48,
        [0, 1, 2].map((s) => ({ canvas: drawBulletImpact(p, s), ms: 60 })),
        { x: 24, y: 24 },
      ),
    ),
    { path: `${root}/tilesets/jungle-ground.png`, content: imageOnly(drawGroundTileset(p)) },
    { path: `${root}/tilesets/jungle-tree.png`, content: imageOnly(drawJungleTree(p)) },
    { path: `${root}/tilesets/jungle-ground.tsj`, content: groundTileset() },
    { path: `${root}/tilesets/jungle-tree.tsj`, content: treeTileset() },
    { path: `${root}/maps/river-village.tmj`, content: vietnamMap() },
  ];
}

/** The example theme (Q60): recolored soldiers, one rifle for both sides, a small arena. */
export function examplePlaceholders(p: ColorPicker): PlaceholderFile[] {
  const common = {
    skin: p.hex('fca790'),
    skinShade: p.hex('e6904e'),
    hair: p.hex('45293f'),
    boots: p.hex('3e3546'),
    eye: p.hex('2e222f'),
    marker: p.hex('fbff86'),
    outline: p.hex('2e222f'),
    blood: p.hex('e83b3b'),
    bloodDark: p.hex('ae2334'),
    pack: p.hex('3e3546'),
  };
  const red: SoldierStyle = {
    ...common,
    uniform: p.hex('e83b3b'),
    uniformShade: p.hex('ae2334'),
    helmet: p.hex('ae2334'),
    helmetShade: p.hex('6e2727'),
    helmetShape: 'm1',
  };
  const blue: SoldierStyle = {
    ...common,
    uniform: p.hex('4d9be6'),
    uniformShade: p.hex('4d65b4'),
    helmet: p.hex('4d65b4'),
    helmetShade: p.hex('484a77'),
    helmetShape: 'm1',
  };
  const root = 'themes/example';
  return [
    ...sheetFiles(`${root}/sprites/characters/red-soldier`, soldierSheet('red-soldier', red)),
    ...sheetFiles(`${root}/sprites/characters/blue-soldier`, soldierSheet('blue-soldier', blue)),
    ...sheetFiles(`${root}/sprites/weapons/rifle`, weaponSheet('rifle', drawM16(p))),
    ...sheetFiles(
      `${root}/sprites/projectiles/bullet`,
      projectileSheet('bullet', drawRifleBullet(p), { x: 28, y: 24 }),
    ),
    ...sheetFiles(
      `${root}/sprites/effects/muzzle-flash`,
      effectSheet(
        'muzzle-flash',
        48,
        [0, 1].map((s) => ({ canvas: drawMuzzleFlash(p, s as 0 | 1), ms: 40 })),
        { x: 4, y: 24 },
      ),
    ),
    ...sheetFiles(
      `${root}/sprites/effects/impact`,
      effectSheet(
        'impact',
        48,
        [0, 1, 2].map((s) => ({ canvas: drawBulletImpact(p, s), ms: 60 })),
        { x: 24, y: 24 },
      ),
    ),
    { path: `${root}/tilesets/training-ground.png`, content: imageOnly(drawGroundTileset(p)) },
    { path: `${root}/tilesets/training-ground.tsj`, content: groundTileset('training-ground') },
    { path: `${root}/maps/arena.tmj`, content: exampleMap() },
  ];
}
