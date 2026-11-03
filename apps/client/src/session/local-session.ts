// A match run in this tab: the match host advanced at 60 ticks per second by a fixed-step
// accumulator fed with real time (decision 0002), so the game runs at the same speed on a
// 60 Hz or 144 Hz screen, and the renderer interpolates between the last two ticks.
import type { MatchHost, WorldView } from '@pixel-shoot/match';
import type { InputCommand, ParticipantId, SimEvent } from '@pixel-shoot/sim';
import { TICK_RATE } from '@pixel-shoot/sim';
import type { Session, SessionFrame } from './session';

const TICK_MS = 1000 / TICK_RATE;
/** Longest catch-up after a stall (a hidden tab, a breakpoint): beyond it, time is dropped. */
export const MAX_CATCH_UP_MS = 250;

export function createLocalSession(host: MatchHost, localParticipant: ParticipantId): Session {
  let previous: WorldView = host.view();
  let current: WorldView = previous;
  let accumulator = 0;
  let input: InputCommand | undefined;

  return {
    get map() {
      return host.map;
    },
    replaceMap: (map) => host.replaceMap(map),
    localParticipant,
    paused: false,
    sendInput(next) {
      input = next;
    },
    advance(deltaMs) {
      if (this.paused) return [];
      accumulator = Math.min(accumulator + Math.max(0, deltaMs), MAX_CATCH_UP_MS);
      const events: SimEvent[] = [];
      while (accumulator >= TICK_MS) {
        accumulator -= TICK_MS;
        if (input) host.submitInput(localParticipant, input);
        events.push(...host.step());
        previous = current;
        current = host.view();
      }
      return events;
    },
    frame(): SessionFrame {
      return { previous, current, alpha: accumulator / TICK_MS };
    },
  };
}
