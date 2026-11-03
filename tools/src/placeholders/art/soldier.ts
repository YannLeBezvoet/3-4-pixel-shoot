// Placeholder chibi soldier, 48×48, ground point at the bottom-center pixel (24, 47).
// A yellow arrow on the chest and a backpack on the back make every drawn direction,
// and the runtime mirroring of left-facing ones, easy to check.
import type { DrawnDirection } from '@pixel-shoot/content';
import { Canvas } from '../canvas';
import type { Color } from '../canvas';

export interface SoldierStyle {
  readonly uniform: Color;
  readonly uniformShade: Color;
  readonly helmet: Color;
  readonly helmetShade: Color;
  readonly helmetShape: 'm1' | 'pith';
  readonly skin: Color;
  readonly skinShade: Color;
  readonly hair: Color;
  readonly boots: Color;
  readonly pack: Color;
  readonly eye: Color;
  readonly marker: Color;
  readonly outline: Color;
  readonly blood: Color;
  readonly bloodDark: Color;
}

export type SoldierPose =
  | { readonly kind: 'stand'; readonly legPhase: -1 | 0 | 1; readonly bob: 0 | 1 }
  | { readonly kind: 'death'; readonly step: 0 | 1 | 2 | 3 };

export interface SoldierFrame {
  readonly canvas: Canvas;
  /** Weapon attachment point (the "hand" slice). */
  readonly hand: { x: number; y: number };
}

const HAND: Record<DrawnDirection, { x: number; y: number }> = {
  down: { x: 32, y: 36 },
  'down-side': { x: 31, y: 35 },
  side: { x: 28, y: 34 },
  'up-side': { x: 29, y: 33 },
  up: { x: 31, y: 33 },
};

function marker(c: Canvas, direction: DrawnDirection, cx: number, cy: number, color: Color) {
  const points: Record<DrawnDirection, [number, number][]> = {
    down: [
      [-2, -1],
      [-1, -1],
      [0, -1],
      [1, -1],
      [2, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    up: [
      [0, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-2, 1],
      [-1, 1],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    side: [
      [-1, -2],
      [-1, -1],
      [0, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [-1, 2],
    ],
    'down-side': [
      [-1, 1],
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
      [0, 0],
    ],
    'up-side': [
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  };
  for (const [dx, dy] of points[direction]) c.set(cx + dx, cy + dy, color);
}

function head(c: Canvas, s: SoldierStyle, direction: DrawnDirection, b: number) {
  const cy = 18 + b;
  // Seen from behind, the head shows hair and the back of the neck, not a face.
  c.ellipse(24, cy, 9, 8, direction === 'up' ? s.hair : s.skin);
  c.ellipse(24, cy + 2, 9, 6, s.skinShade, (_x, y) => y >= cy + 6);
  // Helmet: covers the top of the head, or all of it seen from behind.
  const coverTo = direction === 'up' ? cy + 7 : direction === 'up-side' ? cy + 3 : cy - 1;
  if (s.helmetShape === 'm1') {
    c.ellipse(24, cy - 2, 11, 8, s.helmet, (_x, y) => y <= coverTo);
    c.rect(13, Math.min(coverTo, cy - 1) + 1, 23, 1, s.helmetShade);
  } else {
    c.ellipse(24, cy - 4, 12, 7, s.helmet, (_x, y) => y <= coverTo - 1);
    c.rect(12, Math.min(coverTo, cy - 1), 25, 1, s.helmetShade);
    c.rect(23, cy - 12, 2, 2, s.helmetShade);
  }
  // Face features tell the direction.
  if (direction === 'down') {
    c.rect(20, cy + 1, 2, 2, s.eye);
    c.rect(27, cy + 1, 2, 2, s.eye);
  } else if (direction === 'down-side') {
    c.rect(24, cy + 1, 2, 2, s.eye);
    c.rect(30, cy + 1, 2, 2, s.eye);
  } else if (direction === 'side') {
    c.rect(29, cy, 2, 2, s.eye);
    c.rect(33, cy + 2, 1, 2, s.skin);
  } else if (direction === 'up-side') {
    c.rect(29, cy + 5, 2, 2, s.skinShade);
  }
}

function body(c: Canvas, s: SoldierStyle, direction: DrawnDirection, legPhase: number, b: number) {
  // Legs and boots.
  if (direction === 'side') {
    const stride = legPhase * 2;
    c.rect(21 - stride, 39 + b, 4, 7 - b, s.uniformShade);
    c.rect(21 - stride, 45, 4, 2, s.boots);
    c.rect(25 + stride, 39 + b, 4, 7 - b, s.uniform);
    c.rect(25 + stride, 45, 5, 2, s.boots);
  } else {
    const liftLeft = legPhase < 0 ? 2 : 0;
    const liftRight = legPhase > 0 ? 2 : 0;
    c.rect(19, 39 + b, 4, 7 - b - liftLeft, s.uniform);
    c.rect(19, 45 - liftLeft, 4, 2, s.boots);
    c.rect(26, 39 + b, 4, 7 - b - liftRight, s.uniform);
    c.rect(26, 45 - liftRight, 4, 2, s.boots);
  }
  // Backpack, on the back: visible from the side and from behind.
  if (direction === 'side') c.rect(13, 29 + b, 5, 9, s.pack);
  if (direction === 'up-side') c.rect(15, 29 + b, 6, 9, s.pack);
  // Torso, belt, arms.
  c.rect(17, 28 + b, 14, 12, s.uniform);
  c.rect(17, 28 + b, 2, 12, s.uniformShade);
  c.rect(17, 36 + b, 14, 1, s.uniformShade);
  if (direction === 'up') c.rect(19, 29 + b, 10, 9, s.pack);
  if (direction === 'side') {
    c.rect(24, 30 + b, 3, 6, s.uniformShade);
    c.rect(26, 34 + b, 3, 2, s.skin);
  } else {
    c.rect(15, 29 + b, 2, 7, s.uniformShade);
    c.rect(15, 36 + b, 2, 2, s.skin);
    c.rect(31, 29 + b, 2, 7, s.uniform);
    c.rect(31, 36 + b, 2, 2, s.skin);
  }
  marker(c, direction, 24, 32 + b, s.marker);
}

export function drawSoldier(
  s: SoldierStyle,
  direction: DrawnDirection,
  pose: SoldierPose,
): SoldierFrame {
  const c = new Canvas(48, 48);
  const hand = HAND[direction];
  if (pose.kind === 'stand') {
    body(c, s, direction, pose.legPhase, pose.bob);
    head(c, s, direction, pose.bob);
    c.outline(s.outline);
    return { canvas: c, hand: { x: hand.x, y: hand.y + pose.bob } };
  }
  if (pose.step <= 1) {
    const sink = pose.step * 4;
    body(c, s, direction, 0, Math.min(sink, 1));
    head(c, s, direction, sink);
    c.rect(22, 30 + sink, 3, 3, s.bloodDark);
  } else {
    if (pose.step === 3) c.ellipse(25, 43, 15, 4, s.blood);
    c.ellipse(22, 40, 11, 5, s.uniform);
    c.ellipse(22, 42, 11, 3, s.uniformShade, (_x, y) => y >= 43);
    c.ellipse(36, 39, 6, 5, s.skin);
    c.ellipse(37, 37, 6, 3, s.helmet, (_x, y) => y <= 37);
    c.rect(9, 41, 4, 3, s.boots);
    marker(c, direction, 22, 40, s.marker);
    c.rect(20, 38, 3, 2, s.bloodDark);
  }
  c.outline(s.outline);
  return { canvas: c, hand };
}
