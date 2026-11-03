// npm run assets:placeholders [-- --force]   writes placeholder art (never over replaced files)
// npm run assets:report                      lists placeholders still in use
//
// tools/placeholders.json records the hash of every generated file. A file whose content no
// longer matches its recorded hash has been replaced by real art and is left untouched.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseGpl } from '@pixel-shoot/content';
import { fromRoot } from '../paths';
import { ColorPicker } from './canvas';
import { vietnamPlaceholders } from './catalog';
import type { PlaceholderFile } from './catalog';

const MANIFEST = 'tools/placeholders.json';

type Manifest = Record<string, string>;

const sha256 = (content: Buffer | string) => createHash('sha256').update(content).digest('hex');

async function readManifest(root: string): Promise<Manifest> {
  try {
    return (JSON.parse(await readFile(path.join(root, MANIFEST), 'utf8')) as { files: Manifest })
      .files;
  } catch {
    return {};
  }
}

async function readExisting(file: string): Promise<Buffer | undefined> {
  try {
    return await readFile(file);
  } catch {
    return undefined;
  }
}

export async function catalog(root: string): Promise<PlaceholderFile[]> {
  const palette = parseGpl(await readFile(path.join(root, 'palette', 'resurrect-64.gpl'), 'utf8'));
  return vietnamPlaceholders(new ColorPicker(palette));
}

export type FileStatus = 'placeholder' | 'replaced' | 'missing';

export async function report(root: string): Promise<{ path: string; status: FileStatus }[]> {
  const manifest = await readManifest(root);
  const result: { path: string; status: FileStatus }[] = [];
  for (const file of await catalog(root)) {
    const existing = await readExisting(path.join(root, file.path));
    const status: FileStatus = !existing
      ? 'missing'
      : sha256(existing) === manifest[file.path]
        ? 'placeholder'
        : 'replaced';
    result.push({ path: file.path, status });
  }
  return result;
}

export async function generate(
  root: string,
  { force = false } = {},
  log: (line: string) => void = () => {},
) {
  const manifest = await readManifest(root);
  const next: Manifest = {};
  for (const file of await catalog(root)) {
    const target = path.join(root, file.path);
    const hash = sha256(file.content);
    const existing = await readExisting(target);
    const existingHash = existing && sha256(existing);
    if (existing && existingHash !== hash && existingHash !== manifest[file.path] && !force) {
      log(`kept ${file.path} (replaced by real art)`);
      continue;
    }
    if (existingHash !== hash) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content);
      log(`wrote ${file.path}`);
    }
    next[file.path] = hash;
  }
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(path.join(root, MANIFEST), `${JSON.stringify({ files: sorted }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--report')) {
    const rows = await report(fromRoot());
    for (const status of ['placeholder', 'missing', 'replaced'] as const) {
      const files = rows.filter((r) => r.status === status);
      if (files.length === 0) continue;
      console.log(
        `${status === 'placeholder' ? 'Placeholders still in use' : status === 'missing' ? 'Missing (run npm run assets:placeholders)' : 'Replaced by real art'} (${files.length}):`,
      );
      for (const f of files) console.log(`  ${f.path}`);
    }
  } else {
    await generate(fromRoot(), { force: process.argv.includes('--force') }, (line) =>
      console.log(line),
    );
  }
}
