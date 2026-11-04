// The match drawn from a session frame (ARCHITECTURE §11): ground, blood on it, low map objects
// (sandbags), corpses, the depth-sorted world layer (map objects, characters, projectiles), then overhead
// tiles. Positions are
// interpolated between the last two ticks; the camera keeps the followed character at the
// exact center of the screen (Q20) and snaps to whole pixels.
import type { EntityId, MapData } from '@pixel-shoot/sim';
import type { Renderer, Sprite } from 'pixi.js';
import { Container } from 'pixi.js';
import type { SimEvent } from '@pixel-shoot/sim';
import type { SessionFrame } from '../session/session';
import type { BloodSetting } from './blood';
import { CharacterView, SheetView } from './character-view';
import { DecalLayer } from './decals';
import { depthOf } from './depth';
import { Effects } from './effects';
import { ImageTextures } from './image-textures';
import type { MapView } from './map-view';
import { createMapView } from './map-view';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from './screen-layout';
import type { SeeThrough } from './see-through';
import { SEE_THROUGH_RADIUS, createSeeThrough } from './see-through';
import type { SheetTextures } from './sheet-textures';
import type { ThemeLooks } from './theme-looks';

/** Speed above which a character plays its walk animation, in pixels per second. */
const WALKING_SPEED = 20;

/** Height of the middle of a character above its ground point: the center of the see-through. */
const CHEST_HEIGHT = 20;

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
  /** Flames of what burns overhead. */
  readonly #above = new Container();
  readonly #sheets: SheetTextures;
  readonly #images = new ImageTextures();
  #map: MapView | undefined;
  /** What the map view was built from, to build it again when the map is reset. */
  #mapSource: { map: MapData; images: ReadonlyMap<string, ImageBitmap> } | undefined;
  #looks: ThemeLooks | undefined;
  readonly #characters = new Map<EntityId, CharacterView>();
  readonly #projectiles = new Map<EntityId, SheetView>();
  readonly #effects: Effects;
  readonly #decals: DecalLayer;
  readonly #blood: () => BloodSetting;
  readonly #seeThrough: SeeThrough = createSeeThrough();
  /** What the see-through cuts this frame. */
  #overheadCut = false;
  #cutObjects: readonly Sprite[] = [];
  /** Round of the last frame: blood stays until the next one (Q32). */
  #round: number | undefined;
  /** Top-left corner of the screen in world pixels. */
  #camera = { x: 0, y: 0 };

  constructor(sheets: SheetTextures, renderer: Renderer, blood: () => BloodSetting) {
    this.#sheets = sheets;
    this.#blood = blood;
    this.#decals = new DecalLayer(renderer);
    this.#effects = new Effects(this.#world, this.#above, sheets, this.#decals);
    this.root.addChild(
      this.#ground,
      this.#decals.root,
      this.#low,
      this.#corpses,
      this.#world,
      this.#overhead,
      this.#above,
    );
  }

  /** Follows the events of the session: what changed on the map, and the visual effects. */
  playEvents(events: readonly SimEvent[], frame: SessionFrame): void {
    for (const event of events) this.#changeMap(event);
    if (frame.current.mode.round !== this.#round) {
      this.#round = frame.current.mode.round;
      this.#decals.clear();
    }
    if (this.#looks && events.length > 0)
      this.#effects.play(
        events,
        frame.current,
        this.#looks,
        this.#blood(),
        (x, y) => this.#map?.covering(x, y, 0).overhead ?? false,
      );
  }

  #changeMap(event: SimEvent): void {
    if (event.type === 'tileChanged')
      this.#map?.setTile(event.layer, event.tileX, event.tileY, event.tile);
    else if (event.type === 'elementDestroyed' && event.object !== undefined) {
      const object = this.#mapSource?.map.objects.find((o) => o.id === event.object);
      const remains = event.burnt
        ? (object?.burntVisual ?? object?.destroyedVisual)
        : object?.destroyedVisual;
      this.#map?.destroyObject(event.object, remains);
    } else if (event.type === 'mapReset' && this.#mapSource)
      this.setMap(this.#mapSource.map, this.#mapSource.images);
  }

  setMap(map: MapData, images: ReadonlyMap<string, ImageBitmap>): void {
    if (this.#map) {
      for (const sprite of this.#map.objects) this.#world.removeChild(sprite);
      this.#map.destroy();
    }
    this.#mapSource = { map, images };
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
      view.setBurning(actor.burning ? looks.worldEffect('fire') : undefined);
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
      const z = lerp(old.z, projectile.z, alpha);
      view.root.position.set(Math.round(x), Math.round(y - z));
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
    if (focus) this.#cutThrough(focus.x, focus.y);
    this.#map?.flush();
    this.#map?.cull(this.#camera.x, this.#camera.y, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    this.#decals.cull(this.#camera.x, this.#camera.y, INTERNAL_WIDTH, INTERNAL_HEIGHT);
  }

  /** Opens a window through what covers the followed character (Q34). */
  #cutThrough(x: number, y: number): void {
    const center = y - CHEST_HEIGHT;
    const covering = this.#map?.covering(x, center, SEE_THROUGH_RADIUS);
    const screen = this.toScreen(Math.round(x), Math.round(center));
    this.#seeThrough.center(screen.x, screen.y);
    const filters = [this.#seeThrough.filter];
    if (covering?.overhead !== this.#overheadCut) {
      this.#overheadCut = covering?.overhead ?? false;
      this.#overhead.filters = this.#overheadCut ? filters : [];
    }
    for (const sprite of this.#cutObjects)
      if (!sprite.destroyed && !covering?.objects.includes(sprite)) sprite.filters = [];
    for (const sprite of covering?.objects ?? [])
      if (!this.#cutObjects.includes(sprite)) sprite.filters = filters;
    this.#cutObjects = covering?.objects ?? [];
  }

  destroy(): void {
    this.#map?.destroy();
    this.#decals.destroy();
    this.#images.destroy();
    this.root.destroy({ children: true });
    this.#characters.clear();
    this.#projectiles.clear();
  }
}
