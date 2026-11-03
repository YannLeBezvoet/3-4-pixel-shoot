// Translation files: nested JSON objects whose leaves are strings (i18next format).
// Keys are joined with '.'; plural forms use i18next suffixes (_one, _other, …).
import type { IssueCollector } from '../issues/issues';

export interface LocaleMeta {
  /** The language's own name, shown in the language menu, e.g. "Français". */
  readonly name: string;
}

export interface Locale {
  readonly meta?: LocaleMeta;
  /** Flattened strings: "menu.play" → "Play". */
  readonly strings: ReadonlyMap<string, string>;
}

const KEY_SEGMENT = /^[A-Za-z0-9_-]+$/;
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Parses a translation file. UI files must carry `_meta.name`; theme files must not need it. */
export function parseLocale(json: unknown, file: string, issues: IssueCollector, { requireMeta }: { requireMeta: boolean }): Locale | undefined {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    issues.error(file, '', 'A translation file must be a JSON object of texts.');
    return undefined;
  }
  const strings = new Map<string, string>();
  let valid = true;
  const walk = (node: Record<string, unknown>, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      if (prefix === '' && key === '_meta') continue;
      const path = prefix === '' ? key : `${prefix}.${key}`;
      if (!KEY_SEGMENT.test(key)) {
        issues.error(file, path, `Invalid key "${key}": use letters, digits, "_" and "-" only ("." separates levels).`);
        valid = false;
      } else if (typeof value === 'string') {
        strings.set(path, value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, path);
      } else {
        issues.error(file, path, 'A translation must be a text or a group of texts.');
        valid = false;
      }
    }
  };
  walk(json as Record<string, unknown>, '');

  const rawMeta = (json as { _meta?: unknown })._meta;
  let meta: LocaleMeta | undefined;
  if (rawMeta !== undefined) {
    const name = rawMeta && typeof rawMeta === 'object' ? (rawMeta as { name?: unknown }).name : undefined;
    if (typeof name === 'string' && name.trim() !== '') meta = { name };
    else {
      issues.error(file, '_meta.name', 'The language name must be a non-empty text, e.g. "Français".');
      valid = false;
    }
  } else if (requireMeta) {
    issues.error(file, '_meta', 'Missing "_meta": { "name": "…" } with the language\'s own name, shown in the language menu.');
    valid = false;
  }
  if (!valid) return undefined;
  return meta ? { meta, strings } : { strings };
}

/** Looks a key up, accepting plural forms ("items" matches "items_other"). */
export function hasKey(locale: Locale, key: string): boolean {
  return locale.strings.has(key) || locale.strings.has(`${key}_other`);
}

/** Variables used by a text, e.g. "{{killer}} eliminated {{victim}}" → ["killer", "victim"]. */
export function interpolationVariables(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1] as string))].sort();
}

export interface LocaleComparison {
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly variableMismatches: readonly { key: string; expected: string[]; actual: string[] }[];
}

const baseKey = (key: string) => key.replace(PLURAL_SUFFIX, '');

/**
 * Compares a translation with the reference language. Plural forms are compared by their base key,
 * because languages have different plural categories.
 */
export function compareLocales(reference: Locale, candidate: Locale): LocaleComparison {
  const referenceBases = new Map<string, string>();
  for (const [key, text] of reference.strings) referenceBases.set(baseKey(key), text);
  const candidateBases = new Map<string, string>();
  for (const [key, text] of candidate.strings) candidateBases.set(baseKey(key), text);
  const missing = [...referenceBases.keys()].filter((k) => !candidateBases.has(k));
  const extra = [...candidateBases.keys()].filter((k) => !referenceBases.has(k));
  const variableMismatches = [...referenceBases]
    .filter(([key]) => candidateBases.has(key))
    .map(([key, text]) => ({ key, expected: interpolationVariables(text), actual: interpolationVariables(candidateBases.get(key) as string) }))
    .filter(({ expected, actual }) => expected.join() !== actual.join());
  return { missing, extra, variableMismatches };
}
