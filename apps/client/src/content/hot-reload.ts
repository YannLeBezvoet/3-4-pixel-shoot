// Development hot reload of content: the Vite content plugin reports changed files; changes
// arriving close together (an Aseprite export writes a PNG and a JSON) are reloaded once.
import type { ContentStore } from './content-store';

const EVENT = 'pixel-shoot:content-changed';
const SETTLE_MS = 120;

/** What a changed file requires reloading: a theme, only its maps, or the languages. */
export function scopeOf(path: string): string {
  if (!path.startsWith('themes/')) return 'locales/';
  const [, theme, part] = path.split('/');
  return part === 'maps' || part === 'tilesets' ? `themes/${theme}/maps/` : `themes/${theme}/`;
}

export function enableContentHotReload(store: ContentStore): void {
  const hot = import.meta.hot;
  if (!hot) return;
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> = Promise.resolve();

  const flush = () => {
    const paths = [...pending];
    pending.clear();
    // One reload per theme folder (only its maps when only maps or tilesets changed), or one
    // full reload for interface languages.
    const scopes = new Set(paths.map(scopeOf));
    for (const scope of scopes)
      if (scope.endsWith('/maps/') && scopes.has(scope.slice(0, -'maps/'.length)))
        scopes.delete(scope);
    running = running.then(async () => {
      for (const scope of scopes) await store.reload(scope);
    });
  };

  hot.on(EVENT, (data: { path: string }) => {
    pending.add(data.path);
    clearTimeout(timer);
    timer = setTimeout(flush, SETTLE_MS);
  });
}
