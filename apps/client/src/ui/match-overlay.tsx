// Menus over a running match: the pause menu (Q59: resume, settings, quit) and the end of the
// match (winner, round score, kills and deaths of every participant; play again, main menu).
// Round results are shown by the HUD, not here.
import type { RunningMatch } from '../game/game-app';
import { hudTexts } from '../i18n/hud-texts';
import { useGame } from './game-context';
import { useTranslator } from './translator-context';

export function MatchOverlay({ match }: { match: RunningMatch }) {
  const translator = useTranslator();
  const { t } = translator;
  const game = useGame();
  const phase = match.controller.phase.value;
  if (phase === 'paused') {
    return (
      <main class="screen overlay">
        <section class="panel menu-panel">
          <h1>{t('pause.title')}</h1>
          <nav class="menu-buttons vertical">
            <button type="button" class="primary" onClick={() => match.controller.resume()}>
              {t('pause.resume')}
            </button>
            <button type="button" onClick={() => game.show('settings')}>
              {t('menu.settings')}
            </button>
            <button type="button" onClick={() => game.quitToMenu()}>
              {t('pause.quit')}
            </button>
          </nav>
        </section>
      </main>
    );
  }
  const final = match.controller.final.value;
  if (phase !== 'finished' || !final) return <main class="screen overlay" />;

  const texts = hudTexts(translator, match.assets.theme);
  const scores = final.mode.teamScores ?? [];
  const participants = [...final.participants].sort(
    (a, b) => a.team - b.team || b.kills - a.kills || a.deaths - b.deaths || a.id - b.id,
  );
  return (
    <main class="screen overlay">
      <section class="panel menu-panel end-panel">
        <h1>{final.mode.banner ? texts.display(final.mode.banner) : ''}</h1>
        <p>
          {t('hud.score', {
            team1: texts.teamName(1),
            team2: texts.teamName(2),
            score1: scores[0] ?? 0,
            score2: scores[1] ?? 0,
          })}
        </p>
        <table class="scoreboard">
          <thead>
            <tr>
              <th>{t('end.player')}</th>
              <th>{t('end.team')}</th>
              <th>{t('end.kills')}</th>
              <th>{t('end.deaths')}</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} class={p.id === match.local ? 'local' : undefined}>
                <td>{texts.display(p.name)}</td>
                <td>{texts.teamName(p.team)}</td>
                <td>{p.kills}</td>
                <td>{p.deaths}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <nav class="menu-buttons">
          <button type="button" class="primary" onClick={() => game.playAgain()}>
            {t('end.again')}
          </button>
          <button type="button" onClick={() => game.quitToMenu()}>
            {t('end.menu')}
          </button>
        </nav>
      </section>
    </main>
  );
}
