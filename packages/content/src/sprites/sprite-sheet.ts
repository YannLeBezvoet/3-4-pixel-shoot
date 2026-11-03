// Reads Aseprite sprite sheet exports (JSON "array" or "hash" format) into a SpriteSheet.
import type { Vec2 } from '@pixel-shoot/shared';
import { z } from 'zod';
import type { IssueCollector } from '../issues/issues';
import { validate } from '../issues/zod';
import type { DrawnDirection, SpriteRequirements } from './conventions';
import { DRAWN_DIRECTIONS, GRID, parseTagName, tagName } from './conventions';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface SpriteFrame extends Rect {
  readonly durationMs: number;
}

export type Playback = 'forward' | 'reverse' | 'pingpong' | 'pingpong_reverse';

export interface SpriteAnimation {
  /** Tag name as written in Aseprite. */
  readonly name: string;
  readonly action: string;
  readonly direction?: DrawnDirection;
  readonly from: number;
  readonly to: number;
  readonly playback: Playback;
  /** Number of times the animation plays; 0 means it loops forever. */
  readonly repeat: number;
}

export interface SliceKey {
  readonly frame: number;
  readonly bounds: Rect;
  readonly pivot?: Vec2;
}

export interface SpriteSheet {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frames: readonly SpriteFrame[];
  readonly animations: ReadonlyMap<string, SpriteAnimation>;
  readonly slices: ReadonlyMap<string, readonly SliceKey[]>;
}

const rect = z.object({ x: z.int(), y: z.int(), w: z.int().positive(), h: z.int().positive() });
const frame = z.object({ frame: rect, duration: z.number().nonnegative().default(100) });
const asepriteExport = z.object({
  frames: z.union([z.array(frame), z.record(z.string(), frame)]),
  meta: z.object({
    frameTags: z
      .array(
        z.object({
          name: z.string(),
          from: z.int().nonnegative(),
          to: z.int().nonnegative(),
          direction: z
            .enum(['forward', 'reverse', 'pingpong', 'pingpong_reverse'])
            .default('forward'),
          repeat: z.union([z.string(), z.number()]).optional(),
        }),
      )
      .default([]),
    slices: z
      .array(
        z.object({
          name: z.string(),
          keys: z
            .array(
              z.object({
                frame: z.int().nonnegative(),
                bounds: rect,
                pivot: z.object({ x: z.int(), y: z.int() }).optional(),
              }),
            )
            .min(1),
        }),
      )
      .default([]),
  }),
});

/** Parses an Aseprite JSON export, reporting structural problems. */
export function parseSpriteSheet(
  json: unknown,
  file: string,
  issues: IssueCollector,
): SpriteSheet | undefined {
  const data = validate(asepriteExport, json, file, issues);
  if (!data) return undefined;
  const frames = (Array.isArray(data.frames) ? data.frames : Object.values(data.frames)).map(
    (f): SpriteFrame => ({ ...f.frame, durationMs: f.duration }),
  );
  if (frames.length === 0) {
    issues.error(file, 'frames', 'The sprite sheet has no frames.');
    return undefined;
  }
  const first = frames[0] as SpriteFrame;
  let valid = true;
  frames.forEach((f, index) => {
    if (f.w !== first.w || f.h !== first.h) {
      issues.error(
        file,
        `frames[${index}]`,
        `Frame ${index} is ${f.w}×${f.h} px but frame 0 is ${first.w}×${first.h} px. All frames of a sprite must have the same size; export without trimming.`,
      );
      valid = false;
    }
  });
  if (first.w % GRID !== 0 || first.h % GRID !== 0) {
    issues.error(
      file,
      'frames',
      `Frames are ${first.w}×${first.h} px; frame sides must be multiples of ${GRID} px (48, 96, 144…).`,
    );
    valid = false;
  }

  const animations = new Map<string, SpriteAnimation>();
  data.meta.frameTags.forEach((tag, index) => {
    const location = `meta.frameTags[${index}] ("${tag.name}")`;
    const parsed = parseTagName(tag.name);
    if (!parsed.ok) {
      issues.error(file, location, parsed.message);
      valid = false;
      return;
    }
    if (animations.has(tag.name)) {
      issues.error(
        file,
        location,
        `Tag "${tag.name}" is defined twice. Each animation needs a unique tag.`,
      );
      valid = false;
      return;
    }
    if (tag.from > tag.to || tag.to >= frames.length) {
      issues.error(
        file,
        location,
        `Tag "${tag.name}" covers frames ${tag.from}–${tag.to}, but the sheet has frames 0–${frames.length - 1}.`,
      );
      valid = false;
      return;
    }
    const repeat = tag.repeat === undefined ? 0 : Number(tag.repeat);
    animations.set(tag.name, {
      name: tag.name,
      action: parsed.action,
      ...(parsed.direction ? { direction: parsed.direction } : {}),
      from: tag.from,
      to: tag.to,
      playback: tag.direction,
      repeat: Number.isInteger(repeat) && repeat > 0 ? repeat : 0,
    });
  });

  const slices = new Map<string, SliceKey[]>();
  for (const slice of data.meta.slices) {
    const keys = [...slice.keys]
      .sort((a, b) => a.frame - b.frame)
      .map((k): SliceKey => ({
        frame: k.frame,
        bounds: k.bounds,
        ...(k.pivot ? { pivot: k.pivot } : {}),
      }));
    slices.set(slice.name, keys);
  }

  if (!valid) return undefined;
  return { frameWidth: first.w, frameHeight: first.h, frames, animations, slices };
}

/** Reports missing animations and slices for a kind of sprite. */
export function checkSpriteRequirements(
  sheet: SpriteSheet,
  requirements: SpriteRequirements,
  file: string,
  issues: IssueCollector,
): void {
  for (const action of requirements.directionalActions) {
    const missing = DRAWN_DIRECTIONS.filter((d) => !sheet.animations.has(tagName(action, d)));
    if (missing.length > 0) {
      issues.error(
        file,
        'meta.frameTags',
        `Missing animation tag${missing.length > 1 ? 's' : ''} ${missing.map((d) => `"${tagName(action, d)}"`).join(', ')}. A ${requirements.kind} needs the actions ${requirements.directionalActions.join(', ')} in the 5 drawn directions: ${DRAWN_DIRECTIONS.join(', ')}.`,
      );
    }
  }
  for (const action of requirements.actions) {
    if (!sheet.animations.has(action)) {
      issues.error(
        file,
        'meta.frameTags',
        `Missing animation tag "${action}". ${/^[aeiou]/.test(requirements.kind) ? 'An' : 'A'} ${requirements.kind} sprite needs the animation${requirements.actions.length > 1 ? 's' : ''} ${requirements.actions.map((a) => `"${a}"`).join(', ')}.`,
      );
    }
  }
  for (const [name, purpose] of Object.entries(requirements.slices)) {
    if (!sheet.slices.has(name)) {
      issues.error(
        file,
        'meta.slices',
        `Missing slice "${name}" (${purpose}). Add a slice named "${name}" in Aseprite, set its pivot, and export with slices.`,
      );
    }
  }
}

/** Frame indices of one cycle of an animation, in play order. */
export function playOrder(animation: SpriteAnimation): number[] {
  const up: number[] = [];
  for (let i = animation.from; i <= animation.to; i++) up.push(i);
  const down = [...up].reverse();
  switch (animation.playback) {
    case 'forward':
      return up;
    case 'reverse':
      return down;
    case 'pingpong':
      return [...up, ...down.slice(1, -1)];
    case 'pingpong_reverse':
      return [...down, ...up.slice(1, -1)];
  }
}

/**
 * A slice's point in frame coordinates for a given frame: its pivot if it has one,
 * otherwise the center of its bounds. A slice key applies from its frame until the next key.
 */
export function slicePoint(sheet: SpriteSheet, name: string, frameIndex: number): Vec2 | undefined {
  const keys = sheet.slices.get(name);
  if (!keys) return undefined;
  let key = keys[0] as SliceKey;
  for (const k of keys) if (k.frame <= frameIndex) key = k;
  const pivot = key.pivot ?? { x: Math.floor(key.bounds.w / 2), y: Math.floor(key.bounds.h / 2) };
  return { x: key.bounds.x + pivot.x, y: key.bounds.y + pivot.y };
}

/** The ground point of a frame: the "origin" slice, or the bottom-center pixel by default. */
export function originOf(sheet: SpriteSheet, frameIndex: number): Vec2 {
  return (
    slicePoint(sheet, 'origin', frameIndex) ?? {
      x: Math.floor(sheet.frameWidth / 2),
      y: sheet.frameHeight - 1,
    }
  );
}
