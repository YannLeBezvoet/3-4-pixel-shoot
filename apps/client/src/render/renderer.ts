// The PixiJS renderer: a fixed 960×540 canvas, nearest-neighbor everywhere, upscaled by
// CSS with the integer factor from computeLayout (decision 0003).
import { Application, TextureSource } from 'pixi.js';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH, computeLayout } from './screen-layout';
import type { ScreenLayout } from './screen-layout';

export interface Renderer {
  readonly app: Application;
  readonly layout: () => ScreenLayout;
  /** Called with the new layout whenever the window or the pixel ratio changes. */
  onLayout(listener: (layout: ScreenLayout) => void): void;
}

/** Letterbox and clear color: the darkest Resurrect 64 color. */
const BACKGROUND = 0x2e222f;

export async function createRenderer(host: HTMLElement): Promise<Renderer> {
  TextureSource.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({
    width: INTERNAL_WIDTH,
    height: INTERNAL_HEIGHT,
    resolution: 1,
    autoDensity: false,
    antialias: false,
    roundPixels: true,
    background: BACKGROUND,
  });
  app.canvas.classList.add('game-canvas');
  host.prepend(app.canvas);

  const listeners: ((layout: ScreenLayout) => void)[] = [];
  let current = computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  const apply = () => {
    current = computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio);
    const style = app.canvas.style;
    style.width = `${current.cssWidth}px`;
    style.height = `${current.cssHeight}px`;
    style.left = `${current.cssLeft}px`;
    style.top = `${current.cssTop}px`;
    for (const listener of listeners) listener(current);
  };
  window.addEventListener('resize', apply);
  // Pixel ratio changes (browser zoom, moving to another screen) do not always fire "resize".
  const watchRatio = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
      'change',
      () => {
        apply();
        watchRatio();
      },
      { once: true },
    );
  };
  watchRatio();
  apply();

  return {
    app,
    layout: () => current,
    onLayout: (listener) => {
      listeners.push(listener);
      listener(current);
    },
  };
}
