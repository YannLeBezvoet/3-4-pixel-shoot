// Client entry point (composition root).
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { parseGpl } from '@pixel-shoot/content';
import paletteText from '../../../palette/resurrect-64.gpl?raw';
import { createContentStore } from './content/content-store';
import { fetchFileProvider } from './content/fetch-files';
import { enableContentHotReload } from './content/hot-reload';
import { createTranslator } from './i18n/translator';
import { createRenderer } from './render/renderer';
import { createTestPattern } from './render/test-pattern';
import { HomeScreen } from './ui/home-screen';
import { mountUi } from './ui/mount';
import './style.css';

const DEV_PAGES = [{ path: '/dev/sprites', titleKey: 'dev.spriteViewer' }] as const;

const host = document.getElementById('game');
if (!host) throw new Error('Missing #game element in index.html.');

const files = fetchFileProvider();
const translator = await createTranslator(files);
const store = await createContentStore(files, translator);

const renderer = await createRenderer(host);
const layout = signal(renderer.layout());
renderer.onLayout((next) => (layout.value = next));

let page: ComponentChildren = <HomeScreen devPages={import.meta.env.DEV ? DEV_PAGES : []} />;
if (import.meta.env.DEV) {
  enableContentHotReload(store);
  renderer.app.stage.addChild(createTestPattern(parseGpl(paletteText)));
  if (location.pathname === '/dev/sprites') {
    const { createSpriteViewer } = await import('./dev/sprite-viewer/mount');
    page = createSpriteViewer(renderer, store);
  }
  const { ContentIssues } = await import('./dev/content-issues');
  page = (
    <>
      {page}
      <ContentIssues store={store} />
    </>
  );
}

mountUi({ host, layout, translator, page });
