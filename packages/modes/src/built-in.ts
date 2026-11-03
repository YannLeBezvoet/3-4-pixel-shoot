// Every game mode the game ships with. A new mode is a folder in this package plus one line
// here (docs/guides/add-a-mode.md).
import type { GameModeDefinition } from '@pixel-shoot/sim';
import { teamElimination } from './team-elimination/team-elimination';

/** Modes offered to players. `sandbox` is for development and is not listed. */
export const builtInModes: readonly GameModeDefinition[] = [teamElimination];
