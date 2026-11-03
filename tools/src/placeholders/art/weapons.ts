// Placeholder rifles, 48×48, drawn pointing right. "grip" is the rotation point held in
// the hand; "muzzle" is where projectiles start.
import { Canvas } from '../canvas';
import type { ColorPicker } from '../canvas';

export interface WeaponArt {
  readonly canvas: Canvas;
  readonly grip: { x: number; y: number };
  readonly muzzle: { x: number; y: number };
}

export function drawM16(p: ColorPicker): WeaponArt {
  const c = new Canvas(48, 48);
  const metal = p.hex('313638');
  const light = p.hex('625565');
  c.rect(6, 23, 9, 4, metal); // stock
  c.rect(6, 22, 3, 6, metal);
  c.rect(15, 22, 14, 4, metal); // receiver
  c.rect(15, 22, 14, 1, light);
  c.rect(18, 20, 8, 2, metal); // carry handle
  c.rect(17, 26, 3, 4, metal); // pistol grip
  c.rect(22, 26, 3, 5, light); // magazine
  c.rect(29, 23, 12, 2, metal); // barrel
  c.rect(36, 21, 1, 2, metal); // front sight
  c.rect(41, 23, 2, 2, light); // flash hider
  c.outline(p.hex('2e222f'));
  return { canvas: c, grip: { x: 18, y: 27 }, muzzle: { x: 43, y: 24 } };
}

export function drawAk47(p: ColorPicker): WeaponArt {
  const c = new Canvas(48, 48);
  const metal = p.hex('3e3546');
  const wood = p.hex('9e4539');
  const woodLight = p.hex('cd683d');
  c.rect(5, 23, 10, 4, wood); // stock
  c.rect(5, 23, 10, 1, woodLight);
  c.rect(15, 22, 13, 4, metal); // receiver
  c.rect(17, 26, 3, 4, wood); // pistol grip
  c.line(23, 26, 26, 32, metal); // curved magazine
  c.line(24, 26, 27, 32, metal);
  c.line(25, 26, 28, 31, metal);
  c.rect(28, 22, 7, 3, wood); // handguard
  c.rect(28, 22, 7, 1, woodLight);
  c.rect(35, 23, 7, 2, metal); // barrel
  c.rect(39, 21, 1, 2, metal); // front sight
  c.outline(p.hex('2e222f'));
  return { canvas: c, grip: { x: 18, y: 27 }, muzzle: { x: 42, y: 24 } };
}
