// Placeholder effects and small projectiles: muzzle flash, blood, explosion, flame, smoke, grenade.
import { createRng } from '@pixel-shoot/shared';
import { Canvas } from '../canvas';
import type { ColorPicker } from '../canvas';

/** Muzzle flash pointing right from its origin at (4, 24). */
export function drawMuzzleFlash(p: ColorPicker, step: 0 | 1): Canvas {
  const c = new Canvas(48, 48);
  const length = step === 0 ? 16 : 10;
  c.ellipse(4 + length / 2, 24, length / 2, step === 0 ? 4 : 3, p.hex('f9c22b'));
  c.ellipse(4 + length / 3, 24, length / 3, 2, p.hex('fbff86'));
  c.line(6, 24, 6 + length * 0.6, 24 - length * 0.45, p.hex('f9c22b'));
  c.line(6, 24, 6 + length * 0.6, 24 + length * 0.45, p.hex('f9c22b'));
  return c;
}

/** Blood spraying from the center, growing then thinning out. */
export function drawBloodSplat(p: ColorPicker, step: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`blood-${step}`);
  const radius = 4 + step * 5;
  const colors = [p.hex('e83b3b'), p.hex('ae2334'), p.hex('6e2727')];
  const drops = step === 3 ? 7 : 12;
  for (let i = 0; i < drops; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(radius * 0.3, radius);
    const size = step === 3 ? 1 : rng.int(1, 2);
    c.ellipse(
      24 + Math.cos(angle) * distance,
      24 + Math.sin(angle) * distance,
      size,
      size,
      rng.pick(colors),
    );
  }
  if (step < 2) c.ellipse(24, 24, 3 - step, 3 - step, colors[0] as (typeof colors)[0]);
  return c;
}

/** Explosion, 96×96, centered on (48, 48): a fireball turning into smoke. */
export function drawExplosion(p: ColorPicker, step: number): Canvas {
  const c = new Canvas(96, 96);
  const rng = createRng(`explosion-${step}`);
  const radii = [10, 20, 28, 34, 38, 40];
  const r = radii[step] as number;
  const fire = [
    p.hex('fbff86'),
    p.hex('f9c22b'),
    p.hex('f79617'),
    p.hex('fb6b1d'),
    p.hex('ea4f36'),
  ];
  const smoke = [p.hex('625565'), p.hex('966c6c'), p.hex('3e3546')];
  if (step >= 3) {
    for (let i = 0; i < 9; i++) {
      const angle = rng.range(0, Math.PI * 2);
      c.ellipse(
        48 + Math.cos(angle) * r * 0.55,
        48 + Math.sin(angle) * r * 0.55,
        r * 0.45,
        r * 0.4,
        rng.pick(smoke),
      );
    }
  }
  const layers = Math.max(1, 5 - step);
  for (let i = 0; i < layers; i++) {
    const layerRadius = r * (1 - i / (layers + 1)) * (step >= 3 ? 0.6 : 1);
    c.ellipse(
      48,
      48,
      layerRadius,
      layerRadius,
      fire[Math.min(fire.length - 1, i + step)] as (typeof fire)[0],
    );
  }
  return c;
}

/** Flickering flame, 48×48, its base at the bottom-center. */
export function drawFlame(p: ColorPicker, step: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`flame-${step}`);
  const colors = [
    p.hex('ea4f36'),
    p.hex('fb6b1d'),
    p.hex('f79617'),
    p.hex('f9c22b'),
    p.hex('fbff86'),
  ];
  colors.forEach((color, i) => {
    const height = 30 - i * 5 + rng.int(-2, 2);
    const width = 11 - i * 2;
    c.ellipse(24 + rng.int(-1, 1), 46 - height / 2, width, height / 2, color);
  });
  for (let i = 0; i < 3; i++)
    c.set(24 + rng.int(-8, 8), rng.int(6, 16), colors[3] as (typeof colors)[0]);
  return c;
}

/** Rifle bullet drawn pointing right, its tip (the origin) at (28, 24): a short tracer. */
export function drawRifleBullet(p: ColorPicker): Canvas {
  const c = new Canvas(48, 48);
  c.rect(20, 24, 6, 1, p.hex('f9c22b'));
  c.rect(26, 24, 2, 1, p.hex('fbff86'));
  return c;
}

/** Dust and sparks thrown up where a bullet hits an obstacle, centered on (24, 24). */
export function drawBulletImpact(p: ColorPicker, step: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`impact-${step}`);
  const colors =
    step === 0 ? [p.hex('fbff86'), p.hex('f9c22b')] : [p.hex('ab947a'), p.hex('966c6c')];
  const radius = 2 + step * 2;
  for (let i = 0; i < 6; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(0, radius);
    c.set(
      Math.round(24 + Math.cos(angle) * distance),
      Math.round(24 + Math.sin(angle) * distance),
      rng.pick(colors),
    );
  }
  return c;
}

/** A thrown grenade seen from above, its center (the origin) at (24, 24). */
export function drawGrenade(p: ColorPicker, body: string): Canvas {
  const c = new Canvas(48, 48);
  c.ellipse(24, 24, 3, 3, p.hex(body));
  c.set(25, 21, p.hex('625565'));
  c.outline(p.hex('2e222f'));
  return c;
}

/** A blob of burning fuel, its center (the origin) at (24, 24), flickering. */
export function drawFlameJet(p: ColorPicker, step: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`flame-jet-${step}`);
  const colors = [p.hex('ea4f36'), p.hex('fb6b1d'), p.hex('f9c22b'), p.hex('fbff86')];
  colors.forEach((color, i) => {
    const radius = 8 - i * 2;
    c.ellipse(24 + rng.int(-1, 1), 24 + rng.int(-1, 1), radius + 1, radius, color);
  });
  return c;
}

/** A puff of smoke rising and thinning out, centered on (24, 24). */
export function drawSmoke(p: ColorPicker, step: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`smoke-${step}`);
  const colors = [p.hex('625565'), p.hex('3e3546'), p.hex('966c6c')];
  const radius = 6 + step * 3;
  const puffs = 7 - step;
  for (let i = 0; i < puffs; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(0, radius);
    const size = rng.int(3, 6) - Math.floor(step / 2);
    c.ellipse(
      24 + Math.cos(angle) * distance,
      28 - step * 4 + Math.sin(angle) * distance * 0.7,
      size,
      size,
      rng.pick(colors),
    );
  }
  return c;
}

/** One blood stain on the ground, centered on (24, 24). Each variant is a frame. */
export function drawBloodDecal(p: ColorPicker, variant: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`blood-decal-${variant}`);
  const colors = [p.hex('ae2334'), p.hex('6e2727')];
  c.ellipse(24, 24, rng.int(2, 4), rng.int(2, 3), colors[1] as (typeof colors)[0]);
  for (let i = 0; i < 9; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(2, 11);
    const size = rng.int(0, 1);
    c.ellipse(
      24 + Math.cos(angle) * distance,
      24 + Math.sin(angle) * distance,
      size,
      size,
      rng.pick(colors),
    );
  }
  return c;
}

/** A pool of blood under a corpse, centered on (24, 24). Each variant is a frame. */
export function drawBloodPool(p: ColorPicker, variant: number): Canvas {
  const c = new Canvas(48, 48);
  const rng = createRng(`blood-pool-${variant}`);
  const dark = p.hex('6e2727');
  const wet = p.hex('ae2334');
  for (let i = 0; i < 5; i++)
    c.ellipse(24 + rng.int(-7, 7), 24 + rng.int(-4, 4), rng.int(6, 10), rng.int(4, 6), dark);
  for (let i = 0; i < 3; i++)
    c.ellipse(24 + rng.int(-5, 5), 24 + rng.int(-3, 3), rng.int(3, 5), rng.int(2, 3), wet);
  return c;
}
