// Development hot reload of content: the Vite content plugin reports changed files; changes
// arriving close together (an Aseprite export writes a PNG and a JSON) are reloaded once.
import type { ContentStore } from './content-store';

const EVENT = 'pixel-shoot:content-changed';
const SETTLE_MS = 120;

export function enableContentHotReload(store: ContentStore): void {
  const hot = import.meta.hot;
  if (!hot) return;
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> = Promise.resolve();

  const flush = () => {
    const paths = [...pending];
    pending.clear();
    // One reload per theme folder, or one full reload for interface languages.
    const scopes = new Set(
      paths.map((p) => (p.startsWith('themes/') ? p.split('/').slice(0, 2).join('/') : 'locales')),
    );
    running = running.then(async () => {
      for (const scope of scopes)
        await store.reload(scope === 'locales' ? 'locales/' : `${scope}/`);
    });
  };

  hot.on(EVENT, (data: { path: string }) => {
    pending.add(data.path);
    clearTimeout(timer);
    timer = setTimeout(flush, SETTLE_MS);
  });
}
