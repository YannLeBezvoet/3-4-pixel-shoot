// Settings (Q59): the language and the palette pass (Q14).
import { ChoiceGroup } from './choice-group';
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
      <ChoiceGroup
        legend={t('settings.palettePass')}
        options={[
          { value: 'on', label: t('menu.on') },
          { value: 'off', label: t('menu.off') },
        ]}
        value={game.preferences.palettePass.value ? 'on' : 'off'}
        onChange={(value) => (game.preferences.palettePass.value = value === 'on')}
      />
      <p class="hint">{t('settings.palettePassHint')}</p>
      <nav class="menu-buttons">
        <button type="button" onClick={() => game.closeSettings()}>
          {t('menu.back')}
        </button>
      </nav>
    </main>
  );
}
