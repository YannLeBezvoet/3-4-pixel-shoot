import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { GameApp } from '../game/game-app';

export const GameContext = createContext<GameApp | undefined>(undefined);

export function useGame(): GameApp {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame() needs a GameContext provider.');
  return game;
}
