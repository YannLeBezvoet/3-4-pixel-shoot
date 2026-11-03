// npm run sprites:export [-- --watch]
// Exports every .aseprite file under themes/ as <name>.png + <name>.json next to it, with the
// settings the game expects (decision 0007). Needs ASEPRITE_PATH: the Aseprite executable.
import { execFile } from 'node:child_process';
import { watch } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fromRoot, repoRoot } from '../paths';

const run = promisify(execFile);
const SOURCE = /\.(aseprite|ase)$/i;

export async function findAsepriteFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findAsepriteFiles(full)));
    else if (SOURCE.test(entry.name)) found.push(full);
  }
  return found.sort();
}

/** Aseprite command-line arguments: untrimmed frames, JSON array with tags and slices. */
export function exportArguments(source: string): string[] {
  const base = source.replace(SOURCE, '');
  return [
    '-b',
    source,
    '--sheet',
    `${base}.png`,
    '--sheet-type',
    'packed',
    '--data',
    `${base}.json`,
    '--format',
    'json-array',
    '--list-tags',
    '--list-slices',
  ];
}

async function exportOne(aseprite: string, source: string): Promise<boolean> {
  try {
    await run(aseprite, exportArguments(source));
    console.log(`exported ${path.relative(repoRoot, source)}`);
    return true;
  } catch (error) {
    console.log(`✗ ${path.relative(repoRoot, source)}: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  const aseprite = process.env.ASEPRITE_PATH;
  if (!aseprite) {
    console.log(
      'Set ASEPRITE_PATH to the Aseprite executable, for example:\n  ASEPRITE_PATH=/usr/bin/aseprite npm run sprites:export\n  (Windows: C:\\Program Files\\Aseprite\\Aseprite.exe; macOS: /Applications/Aseprite.app/Contents/MacOS/aseprite)',
    );
    process.exitCode = 1;
    return;
  }
  const themes = fromRoot('themes');
  const files = await findAsepriteFiles(themes);
  let ok = true;
  for (const file of files) ok = (await exportOne(aseprite, file)) && ok;
  if (files.length === 0) console.log('No .aseprite file found under themes/.');
  if (!process.argv.includes('--watch')) {
    process.exitCode = ok ? 0 : 1;
    return;
  }
  console.log('Watching themes/ for .aseprite changes (Ctrl+C to stop)…');
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  watch(themes, { recursive: true }, (_event, name) => {
    if (!name || !SOURCE.test(name)) return;
    const file = path.join(themes, name);
    clearTimeout(timers.get(file));
    timers.set(
      file,
      setTimeout(() => void exportOne(aseprite, file), 300),
    );
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
