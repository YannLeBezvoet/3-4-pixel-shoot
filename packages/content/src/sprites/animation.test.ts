import { describe, expect, it } from 'vitest';
import { animationFrameAt } from './animation';
import type { SpriteAnimation, SpriteSheet } from './sprite-sheet';

const sheet: SpriteSheet = {
  frameWidth: 48,
  frameHeight: 48,
  frames: [100, 200, 300, 400].map((durationMs, i) => ({
    x: i * 48,
    y: 0,
    w: 48,
    h: 48,
    durationMs,
  })),
  animations: new Map(),
  slices: new Map(),
};
const walk: SpriteAnimation = {
  name: 'walk',
  action: 'walk',
  from: 0,
  to: 2,
  playback: 'forward',
  repeat: 0,
};

describe('animationFrameAt', () => {
  it('uses each frame duration and loops forever by default', () => {
    expect(
      [0, 99, 100, 299, 300, 599, 600, 700].map((t) => animationFrameAt(sheet, walk, t).frame),
    ).toEqual([0, 0, 1, 1, 2, 2, 0, 1]);
    expect(animationFrameAt(sheet, walk, 10_000).finished).toBe(false);
  });

  it('plays a repeat-limited animation the given number of times, then holds the last frame', () => {
    const death = { ...walk, repeat: 1 };
    expect(animationFrameAt(sheet, death, 599)).toEqual({ frame: 2, finished: false });
    expect(animationFrameAt(sheet, death, 600)).toEqual({ frame: 2, finished: true });
    expect(animationFrameAt(sheet, death, 5000)).toEqual({ frame: 2, finished: true });
  });

  it('follows ping-pong order', () => {
    const pingpong = { ...walk, playback: 'pingpong' as const };
    // order 0,1,2,1 with durations 100,200,300,200
    expect([50, 150, 350, 650, 850].map((t) => animationFrameAt(sheet, pingpong, t).frame)).toEqual(
      [0, 1, 2, 1, 0],
    );
  });
});
