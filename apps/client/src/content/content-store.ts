// Loaded content for the client: themes, their sprite sheets and images. Renderer-agnostic:
// images are ImageBitmaps; render/ turns them into textures. When a reload finds errors, the
// last valid version stays in use and the problems are published in `issues`.
import type { ReadonlySignal } from '@preact/signals';
import { signal } from '@preact/signals';
import type {
  ContentIndex,
  ContentIssue,
  FileProvider,
  SpriteSheet,
  Theme,
} from '@pixel-shoot/content';
import {
  IssueCollector,
  joinPath,
  loadMap,
  loadTheme,
  parseSpriteSheet,
  spriteFiles,
} from '@pixel-shoot/content';
import type { MapData } from '@pixel-shoot/sim';
import { builtInBehaviors } from '@pixel-shoot/sim';
import type { Translator } from '../i18n/translator';
import { loadContentIndex } from './fetch-files';

export interface LoadedSheet {
  /** Asset path inside the theme, without extension, e.g. "sprites/weapons/m16a1". */
  readonly ref: string;
  readonly sheet: SpriteSheet;
  readonly image: ImageBitmap;
}

export interface ThemeAssets {
  readonly theme: Theme;
  /** Every sprite sheet of the theme folder, used by the theme or not. */
  readonly sheets: ReadonlyMap<string, LoadedSheet>;
  /** Maps by reference ("maps/river-village"). A map with errors keeps its last valid version. */
  readonly maps: ReadonlyMap<string, MapData>;
  /** Images drawn by the maps (tilesets), by path relative to the theme folder. */
  readonly images: ReadonlyMap<string, ImageBitmap>;
}

/** Every image path a map draws from. */
function mapImages(map: MapData): Set<string> {
  const paths = new Set<string>();
  for (const type of map.tileTypes) if (type.visual) paths.add(type.visual.image);
  for (const object of map.objects) if (object.visual) paths.add(object.visual.image);
  return paths;
}

export interface ContentStore {
  readonly index: ReadonlySignal<ContentIndex>;
  readonly themes: ReadonlySignal<ReadonlyMap<string, ThemeAssets>>;
  /** Current content problems, from every source. Empty when everything is valid. */
  readonly issues: ReadonlySignal<readonly ContentIssue[]>;
  /** Reloads everything a changed file may affect. */
  reload(changedPath?: string): Promise<void>;
}

async function loadImage(url: string): Promise<ImageBitmap | undefined> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return undefined;
  return createImageBitmap(await response.blob());
}

export async function createContentStore(
  files: FileProvider,
  translator: Translator,
  base: string = import.meta.env.BASE_URL,
): Promise<ContentStore> {
  const index = signal<ContentIndex>({ languages: [], themes: [] });
  const themes = signal<ReadonlyMap<string, ThemeAssets>>(new Map());
  const issues = signal<readonly ContentIssue[]>([]);
  const issuesBySource = new Map<string, readonly ContentIssue[]>();
  const publish = (source: string, list: readonly ContentIssue[]) => {
    issuesBySource.set(source, list);
    issues.value = [...issuesBySource.values()].flat();
  };

  async function loadThemeAssets(id: string): Promise<void> {
    const collector = new IssueCollector();
    const result = await loadTheme(files, id, {
      behaviors: builtInBehaviors,
      languages: index.value.languages,
    });
    collector.add(...result.issues);
    const theme = result.theme;
    const sheets = new Map<string, LoadedSheet>();
    if (theme) {
      const refs = index.value.themes.find((t) => t.id === id)?.sprites ?? [
        ...theme.sprites.keys(),
      ];
      for (const ref of new Set([...theme.sprites.keys(), ...refs])) {
        const paths = spriteFiles(theme.dir, ref);
        let sheet = theme.sprites.get(ref);
        if (!sheet) {
          const text = await files.readText(paths.json);
          try {
            sheet =
              text === undefined
                ? undefined
                : parseSpriteSheet(JSON.parse(text), paths.json, collector);
          } catch (error) {
            collector.error(paths.json, '', `Invalid JSON: ${(error as Error).message}`);
          }
        }
        if (!sheet) continue;
        const image = await loadImage(`${base}${paths.image}`);
        if (!image) collector.error(paths.image, '', 'Sprite sheet image not found or unreadable.');
        else sheets.set(ref, { ref, sheet, image });
      }
    }
    publish(`theme:${id}`, collector.issues);
    if (!theme || collector.hasErrors) return; // keep the last valid version

    const previous = themes.value.get(id);
    const maps = new Map<string, MapData>();
    const images = new Map<string, ImageBitmap>();
    for (const ref of index.value.themes.find((t) => t.id === id)?.maps ?? []) {
      const result = await loadMap(files, theme, ref);
      const mapIssues = new IssueCollector();
      mapIssues.add(...result.issues);
      const map = result.map ?? previous?.maps.get(ref); // an invalid map keeps its last version
      if (map) {
        for (const path of mapImages(map)) {
          if (images.has(path)) continue;
          const image = await loadImage(`${base}${joinPath(theme.dir, path)}`);
          if (image) images.set(path, image);
          else
            mapIssues.error(
              joinPath(theme.dir, path),
              '',
              'Tileset image not found or unreadable.',
            );
        }
        maps.set(ref, map);
      }
      publish(`map:${id}/${ref}`, mapIssues.issues);
    }
    const next = new Map(themes.value);
    next.set(id, { theme, sheets, maps, images });
    themes.value = next;
    translator.addTheme(theme);
  }

  async function loadIndexAndLanguages(): Promise<void> {
    const collector = new IssueCollector();
    index.value = await loadContentIndex(files, collector);
    await translator.reload(index.value, collector);
    publish('interface', collector.issues);
  }

  const store: ContentStore = {
    index,
    themes,
    issues,
    async reload(changedPath) {
      const themeId = changedPath?.startsWith('themes/') ? changedPath.split('/')[1] : undefined;
      if (
        !changedPath ||
        changedPath.startsWith('locales/') ||
        !index.value.themes.some((t) => t.id === themeId)
      ) {
        await loadIndexAndLanguages();
      }
      const ids =
        themeId && index.value.themes.some((t) => t.id === themeId)
          ? [themeId]
          : index.value.themes.map((t) => t.id);
      for (const id of ids) await loadThemeAssets(id);
      // Themes whose folder disappeared are dropped.
      const known = new Set(index.value.themes.map((t) => t.id));
      if ([...themes.value.keys()].some((id) => !known.has(id))) {
        themes.value = new Map([...themes.value].filter(([id]) => known.has(id)));
      }
    },
  };
  await store.reload();
  return store;
}
