// The interface: one screen at a time, over the canvas (decision 0004).
import { MainMenu } from './main-menu';
import { MatchOverlay } from './match-overlay';
import { SettingsScreen } from './settings-screen';
import { SoloSetup } from './solo-setup';
import { useGame } from './game-context';

export function App({ devPages }: { devPages: readonly { path: string; titleKey: string }[] }) {
  const game = useGame();
  const match = game.match.value;
  switch (game.screen.value) {
    case 'solo':
      return <SoloSetup />;
    case 'settings':
      return <SettingsScreen />;
    case 'match':
      return match ? <MatchOverlay match={match} /> : <MainMenu devPages={devPages} />;
    default:
      return <MainMenu devPages={devPages} />;
  }
}
