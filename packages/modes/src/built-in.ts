// Every game mode the game ships with. A new mode is a folder in this package plus one line
// here (docs/guides/add-a-mode.md).
import type { GameModeDefinition } from '@pixel-shoot/sim';
import { sandbox } from './sandbox/sandbox';

export const builtInModes: readonly GameModeDefinition[] = [sandbox];
