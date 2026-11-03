// Visual effects driven by simulation events (ARCHITECTURE §11): a muzzle flash for each shot,
// an impact where a projectile stops against an obstacle, the character's hit effect (blood)
// where a projectile strikes. Presentation only: effects never change the game.
import { animationFrameAt, originOf } from '@pixel-shoot/content';
import type { WorldView } from '@pixel-shoot/match';
import type { SimEvent } from '@pixel-shoot/sim';
import type { Container } from 'pixi.js';
import { Sprite } from 'pixi.js';
import { depthOf } from './depth';
import type { SheetTextures } from './sheet-textures';
import type { SheetLook, ThemeLooks } from './theme-looks';
import { anchorOf } from './weapon-pose';

const EFFECT_TAG = 'play';

interface Effect {
  readonly sprite: Sprite;
  readonly look: SheetLook;
  elapsedMs: number;
}

export class Effects {
  readonly #layer: Container;
  readonly #textures: SheetTextures;
  readonly #effects: Effect[] = [];

  constructor(layer: Container, textures: SheetTextures) {
    this.#layer = layer;
    this.#textures = textures;
  }

  /** Starts the effects of a tick's events. `view` is the tick the events belong to. */
  play(events: readonly SimEvent[], view: WorldView, looks: ThemeLooks): void {
    for (const event of events) {
      if (event.type === 'shotFired')
        this.#add(looks.fireEffect(event.weapon), event.x, event.y, event.z, event.angle);
      else if (event.type === 'projectileImpact')
        this.#add(looks.impactEffect(event.kind), event.x, event.y, event.z, 0);
      else if (event.type === 'hit') {
        const target = view.actors.find((a) => a.id === event.target);
        if (target) this.#add(looks.hitEffect(target.character), event.x, event.y, event.z, 0);
      }
    }
  }

  #add(look: SheetLook | undefined, x: number, y: number, z: number, rotation: number): void {
    if (!look?.sheet.sheet.animations.has(EFFECT_TAG)) return;
    const sprite = new Sprite();
    sprite.position.set(Math.round(x), Math.round(y - z));
    sprite.rotation = rotation;
    sprite.zIndex = depthOf(y, 1023);
    this.#layer.addChild(sprite);
    const effect = { sprite, look, elapsedMs: 0 };
    this.#effects.push(effect);
    this.#draw(effect);
  }

  /** Returns false once the effect has played to its end. */
  #draw(effect: Effect): boolean {
    const { sheet } = effect.look.sheet;
    const animation = sheet.animations.get(EFFECT_TAG);
    if (!animation) return false;
    const { frame, finished } = animationFrameAt(sheet, animation, effect.elapsedMs);
    // An animation that loops forever plays one cycle as an effect.
    const cycle = sheet.frames
      .slice(animation.from, animation.to + 1)
      .reduce((sum, f) => sum + f.durationMs, 0);
    if (finished || (animation.repeat === 0 && effect.elapsedMs >= cycle)) return false;
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
