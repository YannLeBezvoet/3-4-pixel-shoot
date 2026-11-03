// What the interface and the renderer talk to during a match (ARCHITECTURE §6). LocalSession
// runs the match in this tab; RemoteSession (milestone 3) will talk to a server instead.
import type { WorldView } from '@pixel-shoot/match';
import type { InputCommand, MapData, ParticipantId, SimEvent } from '@pixel-shoot/sim';

export interface SessionFrame {
  /** The two latest ticks; draw between them, at `alpha` (0 = previous, 1 = current). */
  readonly previous: WorldView;
  readonly current: WorldView;
  readonly alpha: number;
}

export interface Session {
  readonly map: MapData;
  /** Swaps the map of the running match (development hot reload). */
  replaceMap(map: MapData): void;
  /** The participant this tab controls. */
  readonly localParticipant: ParticipantId;
  /** The input held from now on, until replaced. */
  sendInput(input: InputCommand): void;
  /**
   * Lets `deltaMs` of real time pass: runs the ticks that fit and returns their events, in
   * order. Nothing happens while paused.
   */
  advance(deltaMs: number): readonly SimEvent[];
  frame(): SessionFrame;
  paused: boolean;
}
