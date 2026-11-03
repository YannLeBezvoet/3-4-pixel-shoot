import { signal } from '@preact/signals';
import type { ContentStore } from '../../content/content-store';
import type { Renderer } from '../../render/renderer';
import { toGamePixels } from '../../render/screen-layout';
import { SheetTextures } from '../../render/sheet-textures';
import { createSpriteViewerScene } from '../../render/sprite-viewer-scene';
import { SpriteViewerPage } from './sprite-viewer-page';

/** Builds the sprite viewer: adds its scene to the stage and returns its page. */
export function createSpriteViewer(renderer: Renderer, store: ContentStore) {
  const scene = createSpriteViewerScene(new SheetTextures());
  renderer.app.stage.addChild(scene.root);
  const info = signal(scene.info());
  let sinceInfo = 0;
  renderer.app.ticker.add((ticker) => {
    scene.update(ticker.deltaMS);
    sinceInfo += ticker.deltaMS;
    if (sinceInfo > 100) {
      sinceInfo = 0;
      const next = scene.info();
      if (next.tag !== info.value.tag || next.frame !== info.value.frame) info.value = next;
    }
  });
  window.addEventListener('pointermove', (event) =>
    scene.setPointer(toGamePixels(renderer.layout(), event.clientX, event.clientY)),
  );
  return <SpriteViewerPage store={store} scene={scene} info={info} />;
}
