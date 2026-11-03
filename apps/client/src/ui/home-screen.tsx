import { LanguageMenu } from './language-menu';
import { useTranslator } from './translator-context';

export function HomeScreen({
  devPages,
}: {
  devPages: readonly { path: string; titleKey: string }[];
}) {
  const { t } = useTranslator();
  return (
    <main class="screen home-screen">
      <h1>{t('app.title')}</h1>
      <p>{t('home.status')}</p>
      <LanguageMenu />
      {devPages.length > 0 && (
        <nav class="dev-links" aria-label={t('dev.tools')}>
          <h2>{t('dev.tools')}</h2>
          {devPages.map((page) => (
            <a key={page.path} href={page.path}>
              {t(page.titleKey)}
            </a>
          ))}
        </nav>
      )}
    </main>
  );
}
