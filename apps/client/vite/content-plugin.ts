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

async function spriteRefs(themeDir: string, sub = 'sprites'): Promise<string[]> {
  const refs: string[] = [];
  for (const entry of await list(path.join(themeDir, sub))) {
    const rel = `${sub}/${entry.name}`;
    if (entry.isDir) refs.push(...(await spriteRefs(themeDir, rel)));
    else if (entry.name.endsWith('.json')) refs.push(rel.slice(0, -'.json'.length));
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
    themes.push({ id: entry.name, sprites: await spriteRefs(dir) });
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
