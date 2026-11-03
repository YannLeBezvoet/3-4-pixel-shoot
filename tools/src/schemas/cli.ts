// npm run schemas          → writes every file generated from the engine's definitions:
//                             schemas/*.json (editor JSON Schemas for theme files), the Tiled
//                             project file and the behavior reference
// npm run check:schemas    → fails if any of them is out of date
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildJsonSchemas } from '@pixel-shoot/content';
import { builtInBehaviors } from '@pixel-shoot/sim';
import { fromRoot } from '../paths';
import { renderBehaviorReference } from './behavior-reference';
import { TILED_PROJECT_FILE, renderTiledProject } from './tiled-project';

export const BEHAVIOR_REFERENCE_FILE = 'docs/reference/behaviors.md';

/** Repository path → generated text. */
export function renderSchemas(): Map<string, string> {
  const schemas = buildJsonSchemas(builtInBehaviors);
  return new Map([
    ...Object.entries(schemas).map(
      ([name, schema]) => [`schemas/${name}`, `${JSON.stringify(schema, null, 2)}\n`] as const,
    ),
    [TILED_PROJECT_FILE, renderTiledProject()],
    [BEHAVIOR_REFERENCE_FILE, renderBehaviorReference(builtInBehaviors)],
  ]);
}

async function main(check: boolean) {
  const outdated: string[] = [];
  for (const [file, text] of renderSchemas()) {
    const current = await readFile(fromRoot(file), 'utf8').catch(() => undefined);
    if (current === text) continue;
    if (check) outdated.push(file);
    else {
      await mkdir(path.dirname(fromRoot(file)), { recursive: true });
      await writeFile(fromRoot(file), text);
      console.log(`wrote ${file}`);
    }
  }
  if (check && outdated.length > 0) {
    console.log(
      `Out of date: ${outdated.join(', ')}. Run "npm run schemas" and commit the result.`,
    );
    process.exitCode = 1;
  } else if (check) {
    console.log('✓ Generated files are up to date (schemas, Tiled project, behavior reference).');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.includes('--check'));
