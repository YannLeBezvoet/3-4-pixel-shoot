// Turns Zod validation errors into content issues with readable locations.
import type { z } from 'zod';
import type { IssueCollector } from './issues';
import { describeJsonPath } from './issues';

function messageFor(issue: z.core.$ZodIssue): string {
  if (issue.code === 'unrecognized_keys') {
    const keys = issue.keys.map((key) => `"${key}"`).join(', ');
    return `Unknown field${issue.keys.length > 1 ? 's' : ''} ${keys}. Check the spelling against the documentation.`;
  }
  if (issue.code === 'invalid_type' && issue.input === undefined) {
    return `Missing required field (expected ${issue.expected}).`;
  }
  return issue.message;
}

/**
 * Validates `data` against `schema`, reporting every problem.
 * `basePath` prefixes locations when `data` is a part of `root`.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  file: string,
  issues: IssueCollector,
  { root = data, basePath = [] }: { root?: unknown; basePath?: readonly PropertyKey[] } = {},
): T | undefined {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    issues.error(file, describeJsonPath(root, [...basePath, ...issue.path]), messageFor(issue));
  }
  return undefined;
}
