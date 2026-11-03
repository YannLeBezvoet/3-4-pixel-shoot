// npm run validate:themes [theme ids…]
// Validates every theme (or the given ones) exactly as the game does when loading them:
// theme files, the conversion into the simulation's catalog, and every map.
import type { ContentIssue } from '@pixel-shoot/content';
import { buildCatalog, formatIssues, loadMap, loadTheme } from '@pixel-shoot/content';
import { builtInBehaviors } from '@pixel-shoot/sim';
import { listLanguages, listMaps, listThemes, nodeFileProvider } from '../content/node-files';
import { repoRoot } from '../paths';

function counts(issues: readonly ContentIssue[]): string {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.length - errors;
  return [
    errors && `${errors} error${errors > 1 ? 's' : ''}`,
    warnings && `${warnings} warning${warnings > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(', ');
}

export async function validateThemes(
  ids: readonly string[],
  log: (line: string) => void,
  root = repoRoot,
): Promise<boolean> {
  const languages = await listLanguages(root);
  const files = nodeFileProvider(root);
  let ok = true;
  if (ids.length === 0) log('No theme found in themes/.');
  for (const id of ids) {
    const loaded = await loadTheme(files, id, { behaviors: builtInBehaviors, languages });
    const issues = [...loaded.issues];
    const { theme } = loaded;
    let valid = theme !== undefined;
    if (theme) {
      try {
        buildCatalog(theme);
      } catch (error) {
        issues.push({
          severity: 'error',
          file: theme.dir,
          location: '',
          message: (error as Error).message,
        });
        valid = false;
      }
      for (const ref of await listMaps(id, root)) {
        const map = await loadMap(files, theme, ref);
        issues.push(...map.issues);
        valid &&= map.map !== undefined;
      }
    }
    if (issues.length > 0) log(formatIssues(issues));
    const summary = counts(issues);
    log(valid ? `✓ ${id}: valid${summary ? ` (${summary})` : ''}` : `✗ ${id}: ${summary}`);
    ok &&= valid;
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const ok = await validateThemes(args.length > 0 ? args : await listThemes(), (line) =>
    console.log(line),
  );
  process.exitCode = ok ? 0 : 1;
}
