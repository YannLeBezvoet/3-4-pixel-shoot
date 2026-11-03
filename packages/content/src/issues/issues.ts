// Content problems are collected, not thrown one by one, so the owner sees them all at once.

export type Severity = 'error' | 'warning';

export interface ContentIssue {
  readonly severity: Severity;
  /** File the problem is in, relative to the content root. */
  readonly file: string;
  /** Where in the file, e.g. 'weapons[2] ("m60").params.magazine'; empty for the whole file. */
  readonly location: string;
  readonly message: string;
}

export class IssueCollector {
  readonly #issues: ContentIssue[] = [];

  error(file: string, location: string, message: string): void {
    this.#issues.push({ severity: 'error', file, location, message });
  }

  warning(file: string, location: string, message: string): void {
    this.#issues.push({ severity: 'warning', file, location, message });
  }

  get issues(): readonly ContentIssue[] {
    return this.#issues;
  }

  get hasErrors(): boolean {
    return this.#issues.some((issue) => issue.severity === 'error');
  }
}

/**
 * Renders a JSON path, naming array items by their "id" when they have one:
 * ['weapons', 2, 'params', 'magazine'] → 'weapons[2] ("m60").params.magazine'.
 */
export function describeJsonPath(root: unknown, path: readonly PropertyKey[]): string {
  let text = '';
  let node: unknown = root;
  for (const key of path) {
    if (typeof key === 'number') {
      text += `[${key}]`;
      node = Array.isArray(node) ? node[key] : undefined;
      const id = node && typeof node === 'object' ? (node as { id?: unknown }).id : undefined;
      if (typeof id === 'string') text += ` ("${id}")`;
    } else {
      const name = String(key);
      text += text === '' ? name : `.${name}`;
      node = node && typeof node === 'object' ? (node as Record<string, unknown>)[name] : undefined;
    }
  }
  return text;
}

export function formatIssue(issue: ContentIssue): string {
  const where = issue.location === '' ? issue.file : `${issue.file} › ${issue.location}`;
  const label = issue.severity === 'error' ? 'error' : 'warning';
  return `${label}: ${where}\n  ${issue.message}`;
}

export function formatIssues(issues: readonly ContentIssue[]): string {
  return issues.map(formatIssue).join('\n');
}
