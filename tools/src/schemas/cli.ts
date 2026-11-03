// npm run schemas          → writes schemas/*.json from the engine's Zod schemas
// npm run check:schemas    → fails if the files in schemas/ are out of date
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { buildJsonSchemas } from '@pixel-shoot/content';
import { builtInBehaviors } from '@pixel-shoot/sim';
import { fromRoot } from '../paths';

export function renderSchemas(): Map<string, string> {
  const schemas = buildJsonSchemas(builtInBehaviors);
  return new Map(Object.entries(schemas).map(([name, schema]) => [`schemas/${name}`, `${JSON.stringify(schema, null, 2)}\n`]));
}

async function main(check: boolean) {
  const outdated: string[] = [];
  for (const [file, text] of renderSchemas()) {
    const current = await readFile(fromRoot(file), 'utf8').catch(() => undefined);
    if (current === text) continue;
    if (check) outdated.push(file);
    else {
      await mkdir(fromRoot('schemas'), { recursive: true });
      await writeFile(fromRoot(file), text);
      console.log(`wrote ${file}`);
    }
  }
  if (check && outdated.length > 0) {
    console.log(`Out of date: ${outdated.join(', ')}. Run "npm run schemas" and commit the result.`);
    process.exitCode = 1;
  } else if (check) {
    console.log('✓ schemas/ is up to date.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.includes('--check'));
