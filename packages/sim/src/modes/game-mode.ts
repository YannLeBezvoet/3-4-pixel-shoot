// The game-mode API (ARCHITECTURE §7): a mode is code written against these types only, in
// the `modes` package, and run by the match host. It never reaches into the world: it acts
// through `ModeApi` and reports its public state for the HUD.
import type { Rng } from '@pixel-shoot/shared';
import type { z } from 'zod';
import type { EntityId } from '../core/entities';
import type { SimEvent } from '../core/events';
import type { MapData } from '../map/map-data';
import type { Rules } from '../world/state';
import type { ActorState } from '../world/simulation';

export type ParticipantId = number;

/** A displayed text: a translation key with parameters, or a text typed by a player. */
export type DisplayText =
  | { readonly key: string; readonly params?: Readonly<Record<string, string | number>> }
  | { readonly text: string };

export interface ParticipantInfo {
  readonly id: ParticipantId;
  readonly name: DisplayText;
  readonly team: number;
  readonly kind: 'human' | 'bot';
  /** Character id in the catalog. */
  readonly character: string;
}

/** What a mode needs from a map. */
export interface MapRequirements {
  /** Teams that must each have spawn areas: 1 to `teams`. */
  readonly teams: number;
}

/** State a mode publishes every tick, drawn by generic HUD widgets. */
export interface ModeState {
  /** Round number from 1, for modes with rounds. */
  readonly round?: number;
  /** Ticks left on the mode's main timer. */
  readonly timeLeft?: number;
  /** Score of each team: index 0 is team 1. */
  readonly teamScores?: readonly number[];
  /** A message shown in the middle of the screen. */
  readonly banner?: DisplayText;
  /** Set when the match is over: the winning team, or undefined for a draw. */
  readonly result?: { readonly winner: number | undefined };
}

/** The mode's only door into the match. */
export interface ModeApi {
  readonly map: MapData;
  /** Ticks since the match started. */
  readonly tick: number;
  participants(): readonly ParticipantInfo[];
  /** The character of a participant, alive or dead, if it has one. */
  characterOf(participant: ParticipantId): ActorState | undefined;
  /**
   * Places a new character for a participant on a free spot of its team's spawn areas,
   * replacing its previous one. Returns undefined when no spot is free.
   */
  spawn(participant: ParticipantId): EntityId | undefined;
  /** Removes every character, corpse and projectile: a new round starts clean. */
  clearWorld(): void;
  /** Characters can aim but neither move nor fire while frozen (countdowns). */
  setFrozen(frozen: boolean): void;
  /** The mode's own random stream. */
  readonly random: Rng;
}

export interface GameModeInstance {
  onMatchStart(): void;
  /** Called for each event of a tick, after the simulation step. */
  onEvent(event: SimEvent): void;
  /** Called once per tick, after the events (step 9, mode post-tick). */
  onTick(): void;
  onParticipantJoined(participant: ParticipantId): void;
  onParticipantLeft(participant: ParticipantId): void;
  state(): ModeState;
}

export interface GameModeDefinition<Settings = unknown> {
  /** Identifier, e.g. "team-elimination". */
  readonly id: string;
  /** Translation key of the mode name. */
  readonly nameKey: string;
  /** Settings with their defaults; the generic settings form is built from it (M4). */
  readonly settings: z.ZodType<Settings>;
  readonly mapRequirements: MapRequirements;
  /** Simulation rules that follow from the settings, such as friendly fire. */
  rules(settings: Settings): Partial<Rules>;
  create(api: ModeApi, settings: Settings): GameModeInstance;
}

/** Whether a map has spawn areas for every team a mode needs. */
export function mapSuitsMode(map: MapData, requirements: MapRequirements): boolean {
  for (let team = 1; team <= requirements.teams; team++)
    if (!map.spawns.some((area) => area.team === team)) return false;
  return true;
}
