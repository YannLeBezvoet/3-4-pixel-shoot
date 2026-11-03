import type { SpriteSheet } from '@pixel-shoot/content';
import { viewForOctant } from '@pixel-shoot/content';
import { describe, expect, it } from 'vitest';
import { anchorOf, weaponPose } from './weapon-pose';

const character: SpriteSheet = {
  frameWidth: 48,
  frameHeight: 48,
  frames: [{ x: 0, y: 0, w: 48, h: 48, durationMs: 100 }],
  animations: new Map(),
  slices: new Map([
    ['hand', [{ frame: 0, bounds: { x: 30, y: 34, w: 1, h: 1 }, pivot: { x: 0, y: 0 } }]],
  ]),
};

describe('weaponPose', () => {
  it('puts the grip on the hand, relative to the ground point (24, 47)', () => {
    expect(weaponPose(character, 0, viewForOctant('e'), 0)).toEqual({
      x: 6,
      y: -13,
      rotation: 0,
      flipY: false,
      behind: false,
    });
  });

  it('mirrors the hand for left-facing directions and flips the weapon', () => {
    const pose = weaponPose(character, 0, viewForOctant('w'), Math.PI);
    expect(pose).toMatchObject({ x: -7, y: -13, flipY: true, behind: false });
  });

  it('draws the weapon behind the body when aiming up', () => {
    expect(weaponPose(character, 0, viewForOctant('n'), -Math.PI / 2).behind).toBe(true);
    expect(weaponPose(character, 0, viewForOctant('nw'), (-3 * Math.PI) / 4)).toMatchObject({
      behind: true,
      flipY: true,
    });
  });
});

describe('anchorOf', () => {
  it('converts frame pixels to a 0–1 anchor', () => {
    expect(anchorOf(character, { x: 24, y: 47 })).toEqual({ x: 0.5, y: 47 / 48 });
  });
});
