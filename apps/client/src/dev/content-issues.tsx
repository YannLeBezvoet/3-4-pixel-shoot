// Development overlay listing content problems (validation messages are developer diagnostics,
// in English). The game keeps showing the last valid version of the content meanwhile.
import type { ContentStore } from '../content/content-store';
import { useTranslator } from '../ui/translator-context';

export function ContentIssues({ store }: { store: ContentStore }) {
  const { t } = useTranslator();
  const issues = store.issues.value;
  if (issues.length === 0) return null;
  const errors = issues.filter((i) => i.severity === 'error').length;
  return (
    <section class={`content-issues ${errors > 0 ? 'has-errors' : ''}`} role="alert">
      <h2>
        {errors > 0
          ? t('dev.issues.errors', { count: errors })
          : t('dev.issues.warnings', { count: issues.length })}
      </h2>
      <ul>
        {issues.map((issue, i) => (
          <li key={i} class={issue.severity}>
            <strong>{issue.location ? `${issue.file} › ${issue.location}` : issue.file}</strong>
            <span>{issue.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
