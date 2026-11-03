// npm run check:palette [files…]
// Without arguments, checks every PNG in the repository except test fixtures.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseGpl } from '@pixel-shoot/content';
import { PNG } from 'pngjs';
import { fromRoot, repoRoot } from '../paths';
import { checkImage, describeProblem } from './check';

const SKIPPED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-types',
  'coverage',
  'fixtures',
]);

async function findPngs(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name))
        found.push(...(await findPngs(path.join(dir, entry.name))));
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

export async function runPaletteCheck(
  files: readonly string[],
  log: (line: string) => void,
): Promise<boolean> {
  const palette = parseGpl(await readFile(fromRoot('palette', 'resurrect-64.gpl'), 'utf8'));
  let failed = 0;
  for (const file of files) {
    const relative = path.relative(repoRoot, file);
    let problems;
    try {
      const png = PNG.sync.read(await readFile(file));
      problems = checkImage({ width: png.width, height: png.height, data: png.data }, palette);
    } catch (error) {
      failed++;
      log(`✗ ${relative}\n    cannot be read as a PNG: ${(error as Error).message}`);
      continue;
    }
    if (problems.length === 0) continue;
    failed++;
    log(`✗ ${relative}`);
    for (const problem of problems) log(`    ${describeProblem(problem)}`);
  }
  log(
    failed === 0
      ? `✓ ${files.length} image${files.length === 1 ? '' : 's'} checked against ${palette.name}: all good.`
      : `${failed} of ${files.length} images break the ${palette.name} palette rules.`,
  );
  return failed === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args.map((f) => path.resolve(f)) : await findPngs(repoRoot);
  const ok = await runPaletteCheck(files, (line) => console.log(line));
  process.exitCode = ok ? 0 : 1;
}
