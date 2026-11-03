import { describe, expect, it } from 'vitest';
import { IssueCollector, formatIssues } from '../issues/issues';
import { CHARACTER_SPRITE, viewForOctant } from './conventions';
import {
  checkSpriteRequirements,
  originOf,
  parseSpriteSheet,
  playOrder,
  slicePoint,
} from './sprite-sheet';

function exportJson({
  count = 4,
  size = 48,
  tags = [] as object[],
  slices = [] as object[],
  hash = false,
} = {}) {
  const frames = Array.from({ length: count }, (_, i) => ({
    filename: `f${i}`,
    frame: { x: i * size, y: 0, w: size, h: size },
    duration: 100 + i,
  }));
  return {
    frames: hash ? Object.fromEntries(frames.map((f) => [f.filename, f])) : frames,
    meta: { app: 'https://www.aseprite.org/', image: 'x.png', frameTags: tags, slices },
  };
}

function parse(json: unknown) {
  const issues = new IssueCollector();
  return { sheet: parseSpriteSheet(json, 'x.json', issues), issues };
}

describe('parseSpriteSheet', () => {
  it('reads frames, tags and slices from an array export', () => {
    const { sheet, issues } = parse(
      exportJson({
        tags: [{ name: 'walk.down-side', from: 1, to: 3, direction: 'pingpong', repeat: '2' }],
        slices: [
          {
            name: 'hand',
            keys: [{ frame: 0, bounds: { x: 30, y: 31, w: 1, h: 1 }, pivot: { x: 0, y: 0 } }],
          },
        ],
      }),
    );
    expect(issues.issues).toEqual([]);
    expect(sheet?.frameWidth).toBe(48);
    expect(sheet?.frames[2]).toEqual({ x: 96, y: 0, w: 48, h: 48, durationMs: 102 });
    expect(sheet?.animations.get('walk.down-side')).toEqual({
      name: 'walk.down-side',
      action: 'walk',
      direction: 'down-side',
      from: 1,
      to: 3,
      playback: 'pingpong',
      repeat: 2,
    });
  });

  it('accepts the hash export format', () => {
    expect(parse(exportJson({ hash: true })).sheet?.frames).toHaveLength(4);
  });

  it('rejects frames that are not multiples of 48 or differ in size', () => {
    const { sheet, issues } = parse(exportJson({ size: 40 }));
    expect(sheet).toBeUndefined();
    expect(formatIssues(issues.issues)).toContain('frame sides must be multiples of 48 px');
    const mixed = exportJson();
    (mixed.frames as { frame: { w: number } }[])[1]!.frame.w = 96;
    expect(formatIssues(parse(mixed).issues.issues)).toContain(
      'Frame 1 is 96×48 px but frame 0 is 48×48 px',
    );
  });

  it('explains bad tag names, unknown directions, duplicates and out-of-range tags', () => {
    const { issues } = parse(
      exportJson({
        tags: [
          { name: 'Walk Left', from: 0, to: 0 },
          { name: 'walk.left', from: 0, to: 0 },
          { name: 'idle', from: 0, to: 0 },
          { name: 'idle', from: 1, to: 1 },
          { name: 'death', from: 2, to: 9 },
        ],
      }),
    );
    const text = formatIssues(issues.issues);
    expect(text).toContain('Tag "Walk Left" is not a valid animation name.');
    expect(text).toContain(
      'Tag "walk.left" uses the unknown direction "left". Drawn directions are down, down-side, side, up-side, up; left-facing directions are mirrored automatically.',
    );
    expect(text).toContain('Tag "idle" is defined twice.');
    expect(text).toContain('Tag "death" covers frames 2–9, but the sheet has frames 0–3.');
  });
});

describe('checkSpriteRequirements', () => {
  it('lists missing directional tags and slices', () => {
    const tags = ['down', 'down-side', 'side', 'up-side', 'up'].flatMap((d, i) => [
      { name: `idle.${d}`, from: i % 4, to: i % 4 },
      { name: `death.${d}`, from: 0, to: 0 },
    ]);
    tags.push({ name: 'walk.down', from: 0, to: 3 });
    const { sheet } = parse(exportJson({ tags }));
    const issues = new IssueCollector();
    checkSpriteRequirements(sheet!, CHARACTER_SPRITE, 'x.json', issues);
    expect(issues.issues.map((i) => i.message)).toEqual([
      'Missing animation tags "walk.down-side", "walk.side", "walk.up-side", "walk.up". A character needs the actions idle, walk, death in the 5 drawn directions: down, down-side, side, up-side, up.',
      'Missing slice "hand" (the point where the weapon grip attaches). Add a slice named "hand" in Aseprite, set its pivot, and export with slices.',
    ]);
  });
});

describe('playOrder', () => {
  const anim = { name: 'a', action: 'a', from: 2, to: 5, repeat: 0 } as const;
  it('follows the Aseprite tag direction', () => {
    expect(playOrder({ ...anim, playback: 'forward' })).toEqual([2, 3, 4, 5]);
    expect(playOrder({ ...anim, playback: 'reverse' })).toEqual([5, 4, 3, 2]);
    expect(playOrder({ ...anim, playback: 'pingpong' })).toEqual([2, 3, 4, 5, 4, 3]);
    expect(playOrder({ ...anim, playback: 'pingpong_reverse' })).toEqual([5, 4, 3, 2, 3, 4]);
    expect(playOrder({ ...anim, from: 1, to: 1, playback: 'pingpong' })).toEqual([1]);
  });
});

describe('slicePoint and originOf', () => {
  const { sheet } = parse(
    exportJson({
      slices: [
        {
          name: 'hand',
          keys: [
            { frame: 0, bounds: { x: 30, y: 31, w: 1, h: 1 }, pivot: { x: 0, y: 0 } },
            { frame: 2, bounds: { x: 30, y: 32, w: 1, h: 1 }, pivot: { x: 0, y: 0 } },
          ],
        },
        { name: 'box', keys: [{ frame: 0, bounds: { x: 10, y: 10, w: 5, h: 4 } }] },
      ],
    }),
  );
  it('uses the key in effect for the frame, and the pivot or the center', () => {
    expect(slicePoint(sheet!, 'hand', 1)).toEqual({ x: 30, y: 31 });
    expect(slicePoint(sheet!, 'hand', 3)).toEqual({ x: 30, y: 32 });
    expect(slicePoint(sheet!, 'box', 0)).toEqual({ x: 12, y: 12 });
    expect(slicePoint(sheet!, 'muzzle', 0)).toBeUndefined();
  });
  it('defaults the origin to the bottom-center pixel', () => {
    expect(originOf(sheet!, 0)).toEqual({ x: 24, y: 47 });
  });
});

describe('viewForOctant', () => {
  it('mirrors left-facing directions and puts the weapon behind when aiming up', () => {
    expect(viewForOctant('w')).toEqual({ drawn: 'side', mirrored: true, weaponBehind: false });
    expect(viewForOctant('nw')).toEqual({ drawn: 'up-side', mirrored: true, weaponBehind: true });
    expect(viewForOctant('s')).toEqual({ drawn: 'down', mirrored: false, weaponBehind: false });
  });
});
