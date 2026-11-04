// A character drawn from its sprite sheet: the body faces one of 8 directions (5 drawn, 3
// mirrored) and plays an action; the weapon is a separate sprite rotated to the exact aim. A
// burning character carries a looping flame.
import type { SpriteAnimation } from '@pixel-shoot/content';
import {
  animationFrameAt,
  originOf,
  slicePoint,
  tagName,
  viewForOctant,
} from '@pixel-shoot/content';
import { octantOf } from '@pixel-shoot/shared';
import { Container, Sprite } from 'pixi.js';
import type { LoadedSheet } from '../content/content-store';
import type { SheetTextures } from './sheet-textures';
import { anchorOf, weaponPose } from './weapon-pose';

export interface CharacterLook {
  readonly key: string;
  readonly body: LoadedSheet;
  readonly weapon?: { readonly key: string; readonly sheet: LoadedSheet };
}

export class CharacterView {
  readonly root = new Container();
  readonly #body = new Sprite();
  readonly #weapon = new Sprite();
  readonly #flame = new Sprite();
  readonly #textures: SheetTextures;
  #look: CharacterLook | undefined;
  #burning: { readonly key: string; readonly sheet: LoadedSheet } | undefined;
  #action = 'idle';
  #aim = Math.PI / 2;
  #elapsedMs = 0;
  /** Last drawn frame index and tag, for display in tools. */
  frame = 0;
  tag = '';

  constructor(textures: SheetTextures) {
    this.#textures = textures;
    this.root.addChild(this.#body, this.#weapon, this.#flame);
    this.#flame.visible = false;
  }

  /** The flame drawn over the character, or undefined when it does not burn. */
  setBurning(look: { readonly key: string; readonly sheet: LoadedSheet } | undefined): void {
    this.#burning = look;
  }

  #drawFlame(): void {
    const burning = this.#burning;
    this.#flame.visible = burning !== undefined;
    if (!burning) return;
    const { sheet } = burning.sheet;
    const animation = sheet.animations.get('play');
    if (!animation) return;
    const cycle = sheet.frames
      .slice(animation.from, animation.to + 1)
      .reduce((sum, f) => sum + f.durationMs, 0);
    const elapsedMs = cycle > 0 ? this.#elapsedMs % cycle : 0;
    const { frame } = animationFrameAt(sheet, animation, elapsedMs);
    const anchor = anchorOf(sheet, originOf(sheet, frame));
    this.#flame.texture = this.#textures.frame(burning.key, burning.sheet, frame);
    this.#flame.anchor.set(anchor.x, anchor.y);
  }

  setLook(look: CharacterLook): void {
    this.#look = look;
  }

  /** Changing the action restarts its animation; turning does not. */
  setAction(action: string): void {
    if (action !== this.#action) this.#elapsedMs = 0;
    this.#action = action;
  }

  setAim(angle: number): void {
    this.#aim = angle;
  }

  update(deltaMs: number): void {
    this.#elapsedMs += deltaMs;
    this.#drawFlame();
    const look = this.#look;
    if (!look) return;
    const view = viewForOctant(octantOf(this.#aim));
    const sheet = look.body.sheet;
    const animation: SpriteAnimation | undefined =
      sheet.animations.get(tagName(this.#action, view.drawn)) ?? sheet.animations.get(this.#action);
    const frame = animation ? animationFrameAt(sheet, animation, this.#elapsedMs).frame : 0;
    this.frame = frame;
    this.tag = animation?.name ?? '';
    const anchor = anchorOf(sheet, originOf(sheet, frame));
    this.#body.texture = this.#textures.frame(look.key, look.body, frame);
    this.#body.anchor.set(anchor.x, anchor.y);
    this.#body.scale.set(view.mirrored ? -1 : 1, 1);

    // A dead character drops its weapon: the corpse lies without it.
    const weapon = this.#action === 'death' ? undefined : look.weapon;
    this.#weapon.visible = weapon !== undefined;
    if (!weapon) return;
    const weaponSheet = weapon.sheet.sheet;
    const pose = weaponPose(sheet, frame, view, this.#aim);
    const grip = slicePoint(weaponSheet, 'grip', 0) ?? originOf(weaponSheet, 0);
    const weaponAnchor = anchorOf(weaponSheet, grip);
    this.#weapon.texture = this.#textures.frame(weapon.key, weapon.sheet, 0);
    this.#weapon.anchor.set(weaponAnchor.x, weaponAnchor.y);
    this.#weapon.position.set(pose.x, pose.y);
    this.#weapon.rotation = pose.rotation;
    this.#weapon.scale.set(1, pose.flipY ? -1 : 1);
    this.root.setChildIndex(this.#weapon, pose.behind ? 0 : 1);
  }
}

/** Any sprite sheet playing one of its tags (effects, props, weapons). */
export class SheetView {
  readonly root = new Sprite();
  readonly #textures: SheetTextures;
  #key = '';
  #loaded: LoadedSheet | undefined;
  #tag: string | undefined;
  #elapsedMs = 0;
  frame = 0;

  constructor(textures: SheetTextures) {
    this.#textures = textures;
  }

  show(key: string, loaded: LoadedSheet, tag: string | undefined): void {
    if (tag !== this.#tag || key !== this.#key) this.#elapsedMs = 0;
    this.#key = key;
    this.#loaded = loaded;
    this.#tag = tag;
  }

  update(deltaMs: number): void {
    this.#elapsedMs += deltaMs;
    const loaded = this.#loaded;
    if (!loaded) return;
    const animation = this.#tag ? loaded.sheet.animations.get(this.#tag) : undefined;
    // Effects that play once restart after a pause, so they can be watched again.
    const result = animation
      ? animationFrameAt(loaded.sheet, animation, this.#elapsedMs)
      : { frame: 0, finished: false };
    if (result.finished && this.#elapsedMs > 0) {
      const total = loaded.sheet.frames
        .slice(animation!.from, animation!.to + 1)
        .reduce((s, f) => s + f.durationMs, 0);
      if (this.#elapsedMs > total * animation!.repeat + 600) this.#elapsedMs = 0;
    }
    this.frame = result.frame;
    const anchor = anchorOf(loaded.sheet, originOf(loaded.sheet, result.frame));
    this.root.texture = this.#textures.frame(this.#key, loaded, result.frame);
    this.root.anchor.set(anchor.x, anchor.y);
  }
}
