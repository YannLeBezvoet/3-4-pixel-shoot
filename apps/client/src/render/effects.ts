// Visual effects driven by simulation events (ARCHITECTURE §11): a muzzle flash for each shot,
// an impact where a projectile stops against an obstacle, the character's hit effect (blood)
// where a projectile strikes, blasts, flames looping on what burns and smoke rising from what
// is gone. Presentation only: effects never change the game.
import { animationFrameAt, originOf } from '@pixel-shoot/content';
import type { WorldView } from '@pixel-shoot/match';
import { createRng } from '@pixel-shoot/shared';
import type { SimEvent } from '@pixel-shoot/sim';
import type { Container } from 'pixi.js';
import { Sprite } from 'pixi.js';
import type { LoadedSheet } from '../content/content-store';
import type { BloodSetting } from './blood';
import { bloodPool, woundEffects } from './blood';
import type { DecalLayer } from './decals';
import { depthOf } from './depth';
import type { SheetTextures } from './sheet-textures';
import type { SheetLook, ThemeLooks } from './theme-looks';
import { anchorOf } from './weapon-pose';

const EFFECT_TAG = 'play';
/** From the center of a burning tile to where its flames stand. */
const FLAME_BASE = 20;
/** Largest distance of a stain from the wound, on each axis. */
const STAIN_SCATTER = 14;

interface Effect {
  readonly sprite: Sprite;
  readonly look: SheetLook;
  elapsedMs: number;
  /** Plays until stopped instead of once. */
  readonly loop: boolean;
}

/** Duration of one play of an effect. */
function cycleOf({ sheet }: LoadedSheet): number {
  const animation = sheet.animations.get(EFFECT_TAG);
  if (!animation) return 0;
  return sheet.frames
    .slice(animation.from, animation.to + 1)
    .reduce((sum, f) => sum + f.durationMs, 0);
}

export class Effects {
  readonly #layer: Container;
  readonly #textures: SheetTextures;
  readonly #effects: Effect[] = [];
  /** Flames on map elements, by element key. */
  readonly #fires = new Map<number, Effect>();
  readonly #decals: DecalLayer;
  /** Picks stains; presentation only, so it needs no seed from the simulation. */
  readonly #random = createRng('decals');

  constructor(layer: Container, textures: SheetTextures, decals: DecalLayer) {
    this.#layer = layer;
    this.#textures = textures;
    this.#decals = decals;
  }

  /** Starts the effects of a tick's events. `view` is the tick the events belong to. */
  play(events: readonly SimEvent[], view: WorldView, looks: ThemeLooks, blood: BloodSetting): void {
    for (const event of events) {
      if (event.type === 'shotFired')
        this.#add(looks.fireEffect(event.weapon), event.x, event.y, event.z, event.angle);
      else if (event.type === 'projectileImpact')
        this.#add(looks.impactEffect(event.kind), event.x, event.y, event.z, 0);
      else if (event.type === 'hit') {
        const target = view.actors.find((a) => a.id === event.target);
        if (!target) continue;
        const wound = woundEffects(blood, event.source);
        if (wound.sprayScale > 0) {
          const spray = this.#add(looks.hitEffect(target.character), event.x, event.y, event.z, 0);
          spray?.sprite.scale.set(wound.sprayScale);
        }
        if (wound.impact) this.#add(looks.impactEffect(event.kind), event.x, event.y, event.z, 0);
        if (wound.decal) this.#stain(looks.worldEffect('bloodDecal'), event.x, event.y);
      } else if (event.type === 'damaged' && event.source === 'explosion') {
        const target = view.actors.find((a) => a.id === event.target);
        if (!target) continue;
        const wound = woundEffects(blood, event.source);
        if (wound.sprayScale > 0) {
          const spray = this.#add(looks.hitEffect(target.character), target.x, target.y, 16, 0);
          spray?.sprite.scale.set(wound.sprayScale);
        }
        if (wound.decal) this.#stain(looks.worldEffect('bloodDecal'), target.x, target.y);
      } else if (event.type === 'killed') {
        if (bloodPool(blood, event.source))
          this.#paint(looks.worldEffect('bloodPool'), event.x, event.y);
      } else if (event.type === 'exploded') {
        const look =
          (event.kind === undefined ? undefined : looks.impactEffect(event.kind)) ??
          looks.worldEffect('explosion');
        this.#add(look, event.x, event.y, 0, 0);
      } else if (event.type === 'fireStarted') {
        const look = looks.worldEffect('fire');
        const fire = this.#add(look, event.x, event.y + FLAME_BASE, 0, 0, true);
        if (fire) this.#fires.set(event.element, fire);
      } else if (event.type === 'fireEnded') this.#stopFire(event.element);
      else if (event.type === 'elementDestroyed') {
        const { x, y, width, height } = event.box;
        this.#add(looks.worldEffect('smoke'), x + width / 2, y + height / 2, 0, 0);
      } else if (event.type === 'mapReset')
        for (const element of [...this.#fires.keys()]) this.#stopFire(element);
    }
  }

  /** A stain near a wound. */
  #stain(look: SheetLook | undefined, x: number, y: number): void {
    const scatter = () => this.#random.range(-STAIN_SCATTER, STAIN_SCATTER);
    this.#paint(look, x + scatter(), y + scatter());
  }

  /** Paints one frame of an effect, picked at random, on the ground. */
  #paint(look: SheetLook | undefined, x: number, y: number): void {
    const animation = look?.sheet.sheet.animations.get(EFFECT_TAG);
    if (!look || !animation) return;
    const frame = this.#random.int(animation.from, animation.to);
    const { sheet } = look.sheet;
    const anchor = anchorOf(sheet, originOf(sheet, frame));
    const texture = this.#textures.frame(look.key, look.sheet, frame);
    this.#decals.stamp(texture, x, y, anchor.x, anchor.y);
  }

  #stopFire(element: number): void {
    const fire = this.#fires.get(element);
    if (!fire) return;
    this.#fires.delete(element);
    fire.sprite.destroy();
    this.#effects.splice(this.#effects.indexOf(fire), 1);
  }

  #add(
    look: SheetLook | undefined,
    x: number,
    y: number,
    z: number,
    rotation: number,
    loop = false,
  ): Effect | undefined {
    if (!look?.sheet.sheet.animations.has(EFFECT_TAG)) return undefined;
    const sprite = new Sprite();
    sprite.position.set(Math.round(x), Math.round(y - z));
    sprite.rotation = rotation;
    sprite.zIndex = depthOf(y, 1023);
    this.#layer.addChild(sprite);
    const effect = { sprite, look, elapsedMs: 0, loop };
    this.#effects.push(effect);
    this.#draw(effect);
    return effect;
  }

  /** Returns false once the effect has played to its end. */
  #draw(effect: Effect): boolean {
    const { sheet } = effect.look.sheet;
    const animation = sheet.animations.get(EFFECT_TAG);
    if (!animation) return false;
    const cycle = cycleOf(effect.look.sheet);
    const elapsedMs = effect.loop && cycle > 0 ? effect.elapsedMs % cycle : effect.elapsedMs;
    const { frame, finished } = animationFrameAt(sheet, animation, elapsedMs);
    // An animation that loops forever plays one cycle as an effect.
    if (!effect.loop && (finished || (animation.repeat === 0 && elapsedMs >= cycle))) return false;
    const anchor = anchorOf(sheet, originOf(sheet, frame));
    effect.sprite.texture = this.#textures.frame(effect.look.key, effect.look.sheet, frame);
    effect.sprite.anchor.set(anchor.x, anchor.y);
    return true;
  }

  update(deltaMs: number): void {
    for (let i = this.#effects.length - 1; i >= 0; i--) {
      const effect = this.#effects[i] as Effect;
      effect.elapsedMs += deltaMs;
      if (this.#draw(effect)) continue;
      effect.sprite.destroy();
      this.#effects.splice(i, 1);
    }
  }

  get count(): number {
    return this.#effects.length;
  }
}
