// Settings (Q59): the language for now; the palette pass joins it (Q14).
import { useGame } from './game-context';
import { LanguageMenu } from './language-menu';
import { useTranslator } from './translator-context';

export function SettingsScreen() {
  const { t } = useTranslator();
  const game = useGame();
  return (
    <main class="screen menu-screen">
      <h1>{t('menu.settings')}</h1>
      <LanguageMenu />
      <nav class="menu-buttons">
        <button type="button" onClick={() => game.closeSettings()}>
          {t('menu.back')}
        </button>
      </nav>
    </main>
  );
}
