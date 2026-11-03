// The match drawn from a session frame (ARCHITECTURE §11): ground, low map objects (sandbags),
// corpses, the depth-sorted world layer (map objects, characters, projectiles), then overhead
// tiles. Positions are
// interpolated between the last two ticks; the camera keeps the followed character at the
// exact center of the screen (Q20) and snaps to whole pixels.
import type { EntityId, MapData } from '@pixel-shoot/sim';
import { Container } from 'pixi.js';
import type { SimEvent } from '@pixel-shoot/sim';
import type { SessionFrame } from '../session/session';
import { CharacterView, SheetView } from './character-view';
import { depthOf } from './depth';
import { Effects } from './effects';
import { ImageTextures } from './image-textures';
import type { MapView } from './map-view';
import { createMapView } from './map-view';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from './screen-layout';
import type { SheetTextures } from './sheet-textures';
import type { ThemeLooks } from './theme-looks';

/** Speed above which a character plays its walk animation, in pixels per second. */
const WALKING_SPEED = 20;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface DrawOptions {
  /** Character the camera follows. */
  readonly focus: EntityId | undefined;
  /** Aim drawn for one character instead of its last tick's (the local player's live aim). */
  readonly liveAim?: { readonly entity: EntityId; readonly angle: number };
}

export class WorldScene {
  readonly root = new Container();
  readonly #ground = new Container();
  readonly #low = new Container();
  readonly #corpses = new Container();
  readonly #world = new Container({ sortableChildren: true });
  readonly #overhead = new Container();
  readonly #sheets: SheetTextures;
  readonly #images = new ImageTextures();
  #map: MapView | undefined;
  #looks: ThemeLooks | undefined;
  readonly #characters = new Map<EntityId, CharacterView>();
  readonly #projectiles = new Map<EntityId, SheetView>();
  readonly #effects: Effects;
  /** Top-left corner of the screen in world pixels. */
  #camera = { x: 0, y: 0 };

  constructor(sheets: SheetTextures) {
    this.#sheets = sheets;
    this.#effects = new Effects(this.#world, sheets);
    this.root.addChild(this.#ground, this.#low, this.#corpses, this.#world, this.#overhead);
  }

  /** Starts the visual effects of events (shots, impacts, hits) from the session. */
  playEvents(events: readonly SimEvent[], frame: SessionFrame): void {
    if (this.#looks && events.length > 0) this.#effects.play(events, frame.current, this.#looks);
  }

  setMap(map: MapData, images: ReadonlyMap<string, ImageBitmap>): void {
    if (this.#map) {
      for (const sprite of this.#map.objects) this.#world.removeChild(sprite);
      this.#map.destroy();
    }
    this.#map = createMapView(map, images, this.#images);
    this.#ground.addChild(this.#map.ground);
    this.#low.addChild(this.#map.low);
    this.#overhead.addChild(this.#map.overhead);
    // A map may have no objects; PixiJS refuses addChild() without a child.
    if (this.#map.objects.length > 0) this.#world.addChild(...this.#map.objects);
  }

  setLooks(looks: ThemeLooks): void {
    this.#looks = looks;
  }

  /** Converts world pixels to screen (game) pixels with the current camera. */
  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: x - this.#camera.x, y: y - this.#camera.y };
  }

  draw(frame: SessionFrame, deltaMs: number, options: DrawOptions): void {
    const looks = this.#looks;
    if (!looks) return;
    const { previous, current, alpha } = frame;
    const before = new Map(previous.actors.map((a) => [a.id, a]));

    // Characters: create, update, move between the living and the corpses, remove.
    const seen = new Set<EntityId>();
    let focus: { x: number; y: number } | undefined;
    for (const actor of current.actors) {
      seen.add(actor.id);
      let view = this.#characters.get(actor.id);
      if (!view) {
        const look = looks.character(actor.character);
        if (!look) continue;
        view = new CharacterView(this.#sheets);
        view.setLook(look);
        this.#characters.set(actor.id, view);
      }
      const old = before.get(actor.id) ?? actor;
      const x = lerp(old.x, actor.x, alpha);
      const y = lerp(old.y, actor.y, alpha);
      if (actor.id === options.focus) focus = { x, y };
      view.root.position.set(Math.round(x), Math.round(y));
      view.setAim(options.liveAim?.entity === actor.id ? options.liveAim.angle : actor.aim);
      view.setAction(
        !actor.alive ? 'death' : Math.hypot(actor.vx, actor.vy) > WALKING_SPEED ? 'walk' : 'idle',
      );
      const layer = actor.alive ? this.#world : this.#corpses;
      if (view.root.parent !== layer) layer.addChild(view.root);
      view.root.zIndex = depthOf(y, actor.id);
      view.update(deltaMs);
    }
    for (const [id, view] of this.#characters)
      if (!seen.has(id)) {
        view.root.destroy({ children: true });
        this.#characters.delete(id);
      }

    // Projectiles: drawn at their height above the ground point, rotated to their direction.
    const beforeShots = new Map(previous.projectiles.map((p) => [p.id, p]));
    const shots = new Set<EntityId>();
    for (const projectile of current.projectiles) {
      shots.add(projectile.id);
      let view = this.#projectiles.get(projectile.id);
      if (!view) {
        const look = looks.projectile(projectile.kind);
        if (!look) continue;
        view = new SheetView(this.#sheets);
        view.show(look.key, look.sheet, 'fly');
        this.#projectiles.set(projectile.id, view);
        this.#world.addChild(view.root);
      }
      const old = beforeShots.get(projectile.id) ?? projectile;
      const x = lerp(old.x, projectile.x, alpha);
      const y = lerp(old.y, projectile.y, alpha);
      view.root.position.set(Math.round(x), Math.round(y - projectile.z));
      view.root.rotation = projectile.angle;
      view.root.zIndex = depthOf(y, projectile.id);
      view.update(deltaMs);
    }
    for (const [id, view] of this.#projectiles)
      if (!shots.has(id)) {
        view.root.destroy();
        this.#projectiles.delete(id);
      }

    this.#effects.update(deltaMs);

    // Camera: the followed character at the exact center of the screen (Q20).
    if (focus)
      this.#camera = {
        x: Math.round(focus.x) - INTERNAL_WIDTH / 2,
        y: Math.round(focus.y) - INTERNAL_HEIGHT / 2,
      };
    this.root.position.set(-this.#camera.x, -this.#camera.y);
    this.#map?.cull(this.#camera.x, this.#camera.y, INTERNAL_WIDTH, INTERNAL_HEIGHT);
  }

  destroy(): void {
    this.#map?.destroy();
    this.#images.destroy();
    this.root.destroy({ children: true });
    this.#characters.clear();
    this.#projectiles.clear();
  }
}
