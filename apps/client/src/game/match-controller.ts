// Drives a match on the canvas: the world scene, the HUD and the input, fed by a session every
// frame. Escape pauses (a solo match stops, Q53); after death the camera follows a living
// teammate, and left or right click switches to the next or previous one (Q21, Q53). When the
// mode declares a result, the match is finished and the last view is kept for the end screen.
import type { ReadonlySignal } from '@preact/signals';
import { signal } from '@preact/signals';
import type { WorldView } from '@pixel-shoot/match';
import type { Catalog, EntityId } from '@pixel-shoot/sim';
import type { ThemeAssets } from '../content/content-store';
import { hudTexts } from '../i18n/hud-texts';
import type { Translator } from '../i18n/translator';
import { createGameInput } from '../input/game-input';
import { PAUSE_KEY } from '../input/key-map';
import { Hud } from '../render/hud';
import type { PixelFont } from '../render/pixel-text';
import type { Renderer } from '../render/renderer';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from '../render/screen-layout';
import { SheetTextures } from '../render/sheet-textures';
import { themeLooks } from '../render/theme-looks';
import { WorldScene } from '../render/world-scene';
import type { Session } from '../session/session';
import { cycle, followed } from './spectate';

export type MatchPhase = 'playing' | 'paused' | 'finished';

export interface MatchControllerOptions {
  readonly renderer: Renderer;
  readonly font: PixelFont;
  readonly translator: Translator;
  readonly assets: ThemeAssets;
  readonly mapRef: string;
  readonly session: Session;
  readonly catalog: Catalog;
  /** Whether Escape pauses the match (solo); development pages may keep it running. */
  readonly pausable?: boolean;
}

export class MatchController {
  readonly #phase = signal<MatchPhase>('playing');
  readonly #final = signal<WorldView | undefined>(undefined);
  readonly #options: MatchControllerOptions;
  readonly #scene = new WorldScene(new SheetTextures());
  readonly #hud: Hud;
  readonly #input;
  readonly #tick: (ticker: { deltaMS: number }) => void;
  readonly #keydown: (event: KeyboardEvent) => void;
  #spectated: EntityId | undefined;

  constructor(options: MatchControllerOptions) {
    this.#options = options;
    const { renderer, assets } = options;
    const map = assets.maps.get(options.mapRef);
    if (map) this.#scene.setMap(map, assets.images);
    this.#scene.setLooks(themeLooks(assets));
    this.#hud = new Hud(options.font);
    renderer.app.stage.addChild(this.#scene.root, this.#hud.root);
    renderer.app.canvas.classList.add('in-match');
    this.#input = createGameInput(renderer.layout);
    this.#input.onPress((button) => {
      if (button === 0) this.#cycle(1);
      else if (button === 2) this.#cycle(-1);
    });
    this.#keydown = (event) => {
      if (event.code !== PAUSE_KEY || options.pausable === false) return;
      if (this.#phase.value === 'playing') this.pause();
      else if (this.#phase.value === 'paused') this.resume();
    };
    window.addEventListener('keydown', this.#keydown);
    this.#tick = (ticker) => this.#frame(ticker.deltaMS);
    renderer.app.ticker.add(this.#tick);
  }

  get phase(): ReadonlySignal<MatchPhase> {
    return this.#phase;
  }

  /** The last view of a finished match, for the end screen. */
  get final(): ReadonlySignal<WorldView | undefined> {
    return this.#final;
  }

  pause(): void {
    if (this.#phase.value !== 'playing') return;
    this.#options.session.paused = true;
    this.#options.renderer.app.canvas.classList.remove('in-match');
    this.#phase.value = 'paused';
  }

  resume(): void {
    if (this.#phase.value !== 'paused') return;
    this.#options.session.paused = false;
    this.#options.renderer.app.canvas.classList.add('in-match');
    this.#phase.value = 'playing';
  }

  stop(): void {
    const { renderer } = this.#options;
    renderer.app.ticker.remove(this.#tick);
    window.removeEventListener('keydown', this.#keydown);
    this.#input.dispose();
    renderer.app.canvas.classList.remove('in-match');
    this.#scene.destroy();
    this.#hud.root.destroy({ children: true });
  }

  /** Switches the spectated teammate, only while the player's character is dead. */
  #cycle(direction: 1 | -1): void {
    const view = this.#options.session.frame().current;
    const me = view.participants.find((p) => p.id === this.#options.session.localParticipant);
    const mine = view.actors.find((a) => a.id === me?.entity);
    if (!me || mine?.alive || this.#phase.value !== 'playing') return;
    this.#spectated = cycle(view, me.team, this.#spectated, direction);
  }

  #frame(deltaMs: number): void {
    const { session, catalog, translator, assets } = this.#options;
    const view = session.frame().current;
    const entity = view.participants.find((p) => p.id === session.localParticipant)?.entity;
    const actor = view.actors.find((a) => a.id === entity);
    const gunHeight = actor ? (catalog.characters.get(actor.character)?.gunHeight ?? 0) : 0;
    const origin = actor
      ? this.#scene.toScreen(actor.x, actor.y - gunHeight)
      : { x: INTERNAL_WIDTH / 2, y: INTERNAL_HEIGHT / 2 };
    const command = this.#input.command(origin);
    if (this.#phase.value === 'playing') session.sendInput(command);
    const events = session.advance(deltaMs);
    const frame = session.frame();
    this.#spectated = followed(frame.current, session.localParticipant, this.#spectated);
    const focus = this.#spectated;
    const playing = this.#phase.value === 'playing';
    this.#scene.playEvents(events, frame);
    this.#scene.draw(frame, deltaMs, {
      focus,
      ...(playing &&
        entity !== undefined &&
        actor?.alive && { liveAim: { entity, angle: command.aim } }),
    });
    this.#hud.update({
      view: frame.current,
      local: session.localParticipant,
      followed: focus,
      events,
      pointer: this.#input.pointer(),
      toScreen: (x, y) => this.#scene.toScreen(x, y),
      texts: hudTexts(translator, assets.theme),
      deltaMs,
      crosshair: playing,
    });
    this.#hud.root.visible = this.#phase.value !== 'finished';
    if (frame.current.mode.result && this.#phase.value === 'playing') {
      this.#final.value = frame.current;
      this.#phase.value = 'finished';
      session.paused = true;
      this.#options.renderer.app.canvas.classList.remove('in-match');
    }
  }
}
