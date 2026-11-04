// A solo team elimination match from the choices of the solo setup (Q59): theme, map, side,
// character (Q61), bots on each side (16 participants at most, Q24), bot difficulty and friendly
// fire (Q49). Pure: no DOM, so it is tested directly.
import type { DifficultyLevel } from '@pixel-shoot/bots';
import type { Theme } from '@pixel-shoot/content';
import { buildCatalog } from '@pixel-shoot/content';
import type { MatchHost } from '@pixel-shoot/match';
import { createMatchHost } from '@pixel-shoot/match';
import { teamElimination } from '@pixel-shoot/modes';
import type { Catalog, MapData, ParticipantId } from '@pixel-shoot/sim';
import { mapSuitsMode } from '@pixel-shoot/sim';

export const SOLO_LIMITS = { participants: 16, allies: 7, enemies: 8 } as const;

export interface SoloChoices {
  readonly themeId: string;
  readonly mapRef: string;
  /** The player's team: 1 plays the theme's first faction, 2 the second. */
  readonly side: 1 | 2;
  /** Which character of the side the player plays, in the order of the theme (Q61). */
  readonly character: number;
  /** Bots in the player's team, 0 to 7. */
  readonly allies: number;
  /** Bots in the other team, 1 to 8. */
  readonly enemies: number;
  readonly difficulty: DifficultyLevel;
  readonly friendlyFire: boolean;
}

export interface SoloMatch {
  readonly host: MatchHost;
  readonly catalog: Catalog;
  readonly local: ParticipantId;
}

/** The maps of a theme that suit team elimination, by reference. */
export function soloMaps(maps: ReadonlyMap<string, MapData>): string[] {
  return [...maps]
    .filter(([, map]) => mapSuitsMode(map, teamElimination.mapRequirements))
    .map(([ref]) => ref)
    .sort();
}

/** Keeps the bot counts within the limits (Q24): at least one enemy, 16 participants at most. */
export function clampBots(allies: number, enemies: number): { allies: number; enemies: number } {
  const a = Math.max(0, Math.min(SOLO_LIMITS.allies, Math.round(allies)));
  const e = Math.max(1, Math.min(SOLO_LIMITS.enemies, Math.round(enemies)));
  return { allies: a, enemies: Math.min(e, SOLO_LIMITS.participants - 1 - a) };
}

/** The characters of the faction a team plays, in the order of the theme. */
export function charactersOf(theme: Theme, team: number): string[] {
  const faction = theme.factions[(team - 1) % theme.factions.length]?.id;
  const characters = [...theme.characters.values()].filter((c) => c.faction === faction);
  if (characters.length === 0)
    throw new Error(`Theme "${theme.id}" has no character for team ${team}.`);
  return characters.map((c) => c.id);
}

/** One bot in four plays the side's second character, a flamethrower trooper in Vietnam (Q61). */
export function botCharacter(characters: readonly string[], index: number): string {
  const [first, second] = characters as [string, string?];
  return index % 4 === 3 && second !== undefined ? second : first;
}

export function createSoloMatch(
  theme: Theme,
  map: MapData,
  choices: SoloChoices,
  seed: number,
): SoloMatch {
  const catalog = buildCatalog(theme);
  const host = createMatchHost({
    map,
    catalog,
    mode: teamElimination,
    settings: { friendlyFire: choices.friendlyFire },
    seed,
  });
  const enemySide = choices.side === 1 ? 2 : 1;
  const { allies, enemies } = clampBots(choices.allies, choices.enemies);
  const own = charactersOf(theme, choices.side);
  const local = host.addParticipant({
    name: { key: 'participant.you' },
    team: choices.side,
    character: own[choices.character] ?? (own[0] as string),
    kind: 'human',
  });
  let n = 0;
  for (const [team, count] of [
    [choices.side, allies],
    [enemySide, enemies],
  ] as const)
    for (let i = 0; i < count; i++)
      host.addParticipant({
        name: { key: 'participant.bot', params: { n: ++n } },
        team,
        character: botCharacter(charactersOf(theme, team), i),
        kind: 'bot',
        difficulty: choices.difficulty,
      });
  host.start();
  return { host, catalog, local };
}
