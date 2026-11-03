// Main menu (Q59): solo, settings and the language; developer tools in development builds.
// Multiplayer appears with milestone 3.
import { useGame } from './game-context';
import { LanguageMenu } from './language-menu';
import { useTranslator } from './translator-context';

export function MainMenu({
  devPages,
}: {
  devPages: readonly { path: string; titleKey: string }[];
}) {
  const { t } = useTranslator();
  const game = useGame();
  return (
    <main class="screen menu-screen">
      <h1>{t('app.title')}</h1>
      <nav class="menu-buttons">
        <button type="button" class="primary" onClick={() => game.show('solo')}>
          {t('menu.solo')}
        </button>
        <button type="button" onClick={() => game.show('settings')}>
          {t('menu.settings')}
        </button>
      </nav>
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
