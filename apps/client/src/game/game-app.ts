// Which screen is shown and the running match: the interface asks it to start a solo match,
// pause, resume or quit; it builds the match on the canvas (decision 0004: menus in DOM, the
// match in PixiJS).
import type { ReadonlySignal } from '@preact/signals';
import { signal } from '@preact/signals';
import type { ParticipantId } from '@pixel-shoot/sim';
import type { ContentStore, ThemeAssets } from '../content/content-store';
import type { Translator } from '../i18n/translator';
import type { PixelFont } from '../render/pixel-text';
import type { Renderer } from '../render/renderer';
import { createLocalSession } from '../session/local-session';
import { MatchController } from './match-controller';
import type { SoloChoices } from './solo';
import { createSoloMatch } from './solo';

export type Screen = 'menu' | 'solo' | 'settings' | 'match';

export interface RunningMatch {
  readonly controller: MatchController;
  readonly choices: SoloChoices;
  readonly assets: ThemeAssets;
  /** The participant this tab plays. */
  readonly local: ParticipantId;
}

const CHOICES_KEY = 'pixel-shoot.solo';

function readChoices(): Partial<SoloChoices> {
  try {
    return JSON.parse(localStorage.getItem(CHOICES_KEY) ?? '{}') as Partial<SoloChoices>;
  } catch {
    return {};
  }
}

function saveChoices(choices: SoloChoices): void {
  try {
    localStorage.setItem(CHOICES_KEY, JSON.stringify(choices));
  } catch {
    // Storage may be refused (private windows): the choices then last until the page closes.
  }
}

export class GameApp {
  readonly #screen = signal<Screen>('menu');
  readonly #match = signal<RunningMatch | undefined>(undefined);
  /** Where the settings screen returns to. */
  #settingsFrom: Screen = 'menu';
  readonly lastChoices: Partial<SoloChoices> = readChoices();

  readonly renderer: Renderer;
  readonly store: ContentStore;
  readonly translator: Translator;
  readonly font: PixelFont;

  constructor(renderer: Renderer, store: ContentStore, translator: Translator, font: PixelFont) {
    this.renderer = renderer;
    this.store = store;
    this.translator = translator;
    this.font = font;
  }

  get screen(): ReadonlySignal<Screen> {
    return this.#screen;
  }

  get match(): ReadonlySignal<RunningMatch | undefined> {
    return this.#match;
  }

  show(screen: Exclude<Screen, 'match'>): void {
    if (screen === 'settings') this.#settingsFrom = this.#screen.value;
    this.#screen.value = screen;
  }

  /** Leaves the settings screen for the screen it was opened from. */
  closeSettings(): void {
    this.#screen.value = this.#settingsFrom === 'settings' ? 'menu' : this.#settingsFrom;
  }

  startSolo(choices: SoloChoices): void {
    const assets = this.store.themes.value.get(choices.themeId);
    const map = assets?.maps.get(choices.mapRef);
    if (!assets || !map) return;
    this.#stop();
    saveChoices(choices);
    Object.assign(this.lastChoices, choices);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
    const { host, catalog, local } = createSoloMatch(assets.theme, map, choices, seed);
    const controller = new MatchController({
      renderer: this.renderer,
      font: this.font,
      translator: this.translator,
      assets,
      mapRef: choices.mapRef,
      session: createLocalSession(host, local),
      catalog,
    });
    this.#match.value = { controller, choices, assets, local };
    this.#screen.value = 'match';
  }

  /** Starts a new match with the same choices. */
  playAgain(): void {
    const match = this.#match.value;
    if (match) this.startSolo(match.choices);
  }

  quitToMenu(): void {
    this.#stop();
    this.#screen.value = 'menu';
  }

  #stop(): void {
    this.#match.value?.controller.stop();
    this.#match.value = undefined;
  }
}
