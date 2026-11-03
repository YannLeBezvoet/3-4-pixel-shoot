// npm run validate:themes [theme ids…]
// Validates every theme (or the given ones) exactly as the game does when loading them,
// including the conversion into the simulation's catalog.
import { buildCatalog, formatIssues, loadTheme } from '@pixel-shoot/content';
import { builtInBehaviors } from '@pixel-shoot/sim';
import { listLanguages, listThemes, nodeFileProvider } from '../content/node-files';
import { repoRoot } from '../paths';

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
    const { theme, issues } = await loadTheme(files, id, {
      behaviors: builtInBehaviors,
      languages,
    });
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.length - errors;
    if (issues.length > 0) log(formatIssues(issues));
    const counts = [
      errors && `${errors} error${errors > 1 ? 's' : ''}`,
      warnings && `${warnings} warning${warnings > 1 ? 's' : ''}`,
    ]
      .filter(Boolean)
      .join(', ');
    let catalogError: string | undefined;
    try {
      if (theme) buildCatalog(theme);
    } catch (error) {
      catalogError = (error as Error).message;
    }
    if (catalogError) log(`✗ ${id}: ${catalogError}`);
    else log(theme ? `✓ ${id}: valid${counts ? ` (${counts})` : ''}` : `✗ ${id}: ${counts}`);
    ok &&= theme !== undefined && catalogError === undefined;
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
