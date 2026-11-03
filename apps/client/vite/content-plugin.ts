// Serves themes/ and locales/ from the repository root during development, publishes
// /content-index.json, and copies the content into the production build.
// Source files that the game never reads (.aseprite) are not published.
import { createReadStream } from 'node:fs';
import { cp, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Only types may be imported from workspace packages here: Vite loads its configuration with
// Node, which cannot run the packages' TypeScript sources.
import type { ContentIndex } from '@pixel-shoot/content';
import type { Plugin } from 'vite';

/** Same value as CONTENT_INDEX_FILE in @pixel-shoot/content (checked by a test). */
export const CONTENT_INDEX_FILE = 'content-index.json';
/** Custom hot-reload event sent to the page with { path } relative to the repository root. */
export const CONTENT_CHANGED_EVENT = 'pixel-shoot:content-changed';

const CONTENT_DIRS = ['themes', 'locales'];
const UNPUBLISHED = /\.(aseprite|ase)$/i;
const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.tmj': 'application/json',
  '.tsj': 'application/json',
  '.png': 'image/png',
};

async function list(dir: string): Promise<{ name: string; isDir: boolean }[]> {
  try {
    return (await readdir(dir, { withFileTypes: true })).map((e) => ({
      name: e.name,
      isDir: e.isDirectory(),
    }));
  } catch {
    return [];
  }
}

/** Files with an extension under a theme sub-folder, as paths without extension. */
async function assetRefs(themeDir: string, sub: string, extension: string): Promise<string[]> {
  const refs: string[] = [];
  for (const entry of await list(path.join(themeDir, sub))) {
    const rel = `${sub}/${entry.name}`;
    if (entry.isDir) refs.push(...(await assetRefs(themeDir, rel, extension)));
    else if (entry.name.endsWith(extension)) refs.push(rel.slice(0, -extension.length));
  }
  return refs.sort();
}

export async function buildContentIndex(root: string): Promise<ContentIndex> {
  const languages = (await list(path.join(root, 'locales')))
    .filter((e) => !e.isDir && e.name.endsWith('.json'))
    .map((e) => e.name.slice(0, -'.json'.length))
    .sort();
  const themes = [];
  for (const entry of await list(path.join(root, 'themes'))) {
    const dir = path.join(root, 'themes', entry.name);
    if (!entry.isDir || !(await stat(path.join(dir, 'theme.json')).catch(() => undefined)))
      continue;
    themes.push({
      id: entry.name,
      sprites: await assetRefs(dir, 'sprites', '.json'),
      maps: await assetRefs(dir, 'maps', '.tmj'),
    });
  }
  themes.sort((a, b) => a.id.localeCompare(b.id));
  return { languages, themes };
}

export function contentPlugin({ root }: { root: string }): Plugin {
  let outDir = '';
  return {
    name: 'pixel-shoot-content',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      // Hot reload: tell the page which content file changed; it reloads only what it affects.
      server.watcher.add(CONTENT_DIRS.map((dir) => path.join(root, dir)));
      const notify = (file: string) => {
        const relative = path.relative(root, file).split(path.sep).join('/');
        const [top] = relative.split('/');
        if (!top || !CONTENT_DIRS.includes(top) || UNPUBLISHED.test(relative)) return;
        server.ws.send({ type: 'custom', event: CONTENT_CHANGED_EVENT, data: { path: relative } });
      };
      for (const event of ['add', 'change', 'unlink'] as const) server.watcher.on(event, notify);

      server.middlewares.use(async (req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
        if (url === `/${CONTENT_INDEX_FILE}`) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(await buildContentIndex(root)));
          return;
        }
        const [, top] = url.split('/');
        if (!top || !CONTENT_DIRS.includes(top) || UNPUBLISHED.test(url)) return next();
        const file = path.resolve(root, `.${url}`);
        if (!file.startsWith(path.join(root, top) + path.sep)) return next();
        const info = await stat(file).catch(() => undefined);
        if (!info?.isFile()) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(file).pipe(res);
      });
    },
    async writeBundle() {
      for (const dir of CONTENT_DIRS) {
        await cp(path.join(root, dir), path.join(outDir, dir), {
          recursive: true,
          filter: (source) => !UNPUBLISHED.test(source),
        }).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error;
        });
      }
      await writeFile(
        path.join(outDir, CONTENT_INDEX_FILE),
        JSON.stringify(await buildContentIndex(root)),
      );
    },
  };
}
