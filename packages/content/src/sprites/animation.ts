// Which frame of an animation shows after some time, following Aseprite's frame durations,
// tag direction and repeat count.
import type { SpriteAnimation, SpriteSheet } from './sprite-sheet';
import { playOrder } from './sprite-sheet';

export interface AnimationFrame {
  /** Index into the sheet's frames. */
  readonly frame: number;
  /** True once an animation with a repeat count has played to its end (it then holds its last frame). */
  readonly finished: boolean;
}

export function animationFrameAt(
  sheet: SpriteSheet,
  animation: SpriteAnimation,
  elapsedMs: number,
): AnimationFrame {
  const order = playOrder(animation);
  const durations = order.map((index) => sheet.frames[index]?.durationMs ?? 0);
  const cycle = durations.reduce((sum, d) => sum + d, 0);
  const last = order[order.length - 1] as number;
  if (cycle <= 0) return { frame: order[0] as number, finished: animation.repeat > 0 };
  if (animation.repeat > 0 && elapsedMs >= cycle * animation.repeat)
    return { frame: last, finished: true };
  let t = Math.max(0, elapsedMs) % cycle;
  for (let i = 0; i < order.length; i++) {
    t -= durations[i] as number;
    if (t < 0) return { frame: order[i] as number, finished: false };
  }
  return { frame: last, finished: false };
}
