// Content access from Node: the repository root is the content root.
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { FileProvider } from '@pixel-shoot/content';
import { joinPath } from '@pixel-shoot/content';
import { repoRoot } from '../paths';

export function nodeFileProvider(root = repoRoot): FileProvider {
  const resolve = (file: string) => path.join(root, ...joinPath(file).split('/'));
  return {
    async readText(file) {
      try {
        return await readFile(resolve(file), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
      }
    },
    async exists(file) {
      try {
        await access(resolve(file));
        return true;
      } catch {
        return false;
      }
    },
  };
}

async function entries(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Ids of the themes: folders of themes/ that contain a theme.json. */
export async function listThemes(root = repoRoot): Promise<string[]> {
  const ids: string[] = [];
  for (const entry of await entries(path.join(root, 'themes'))) {
    if (
      entry.isDirectory() &&
      (await nodeFileProvider(root).exists(`themes/${entry.name}/theme.json`))
    )
      ids.push(entry.name);
  }
  return ids.sort();
}

/** Codes of the interface languages: the files of locales/. */
export async function listLanguages(root = repoRoot): Promise<string[]> {
  return (await entries(path.join(root, 'locales')))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name.slice(0, -'.json'.length))
    .sort();
}

/** Maps of a theme: the .tmj files under its maps/ folder, as references like "maps/village". */
export async function listMaps(themeId: string, root = repoRoot): Promise<string[]> {
  const refs: string[] = [];
  const walk = async (sub: string) => {
    for (const entry of await entries(path.join(root, 'themes', themeId, sub))) {
      const rel = `${sub}/${entry.name}`;
      if (entry.isDirectory()) await walk(rel);
      else if (entry.name.endsWith('.tmj')) refs.push(rel.slice(0, -'.tmj'.length));
    }
  };
  await walk('maps');
  return refs.sort();
}
