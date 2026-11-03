// Team elimination (Q21, Q51): two teams, rounds without respawn. A round starts with a
// 3-second countdown (everyone placed, nobody moves or fires), ends when a team has nobody
// standing or when time runs out (more survivors wins; equal is a draw), and its result shows
// for 5 seconds. The first team to `roundsToWin` takes the match; after 3 × roundsToWin rounds
// (9 by default) the team with more round wins takes it, equal is a match draw.
import type { DisplayText, GameModeDefinition, ModeState } from '@pixel-shoot/sim';
import { TICK_RATE } from '@pixel-shoot/sim';
import { z } from 'zod';

export const COUNTDOWN_TICKS = 3 * TICK_RATE;
export const ROUND_OVER_TICKS = 5 * TICK_RATE;

export const teamEliminationSettings = z.strictObject({
  friendlyFire: z.boolean().default(false).describe('Bullets hurt teammates (Q49).'),
  roundsToWin: z.int().min(1).max(10).default(3).describe('Round wins that take the match.'),
  roundSeconds: z.int().min(30).max(900).default(180).describe('Round time limit, in seconds.'),
});

export type TeamEliminationSettings = z.infer<typeof teamEliminationSettings>;

type Phase = 'countdown' | 'playing' | 'roundOver' | 'matchOver';

const key = (name: string, params?: Record<string, string | number>): DisplayText => ({
  key: `mode.team-elimination.${name}`,
  ...(params && { params }),
});

export const teamElimination: GameModeDefinition<TeamEliminationSettings> = {
  id: 'team-elimination',
  nameKey: 'mode.team-elimination.name',
  settings: teamEliminationSettings,
  mapRequirements: { teams: 2 },
  rules: (settings) => ({ friendlyFire: settings.friendlyFire }),
  create(api, settings) {
    const roundTicks = settings.roundSeconds * TICK_RATE;
    const maxRounds = 3 * settings.roundsToWin;
    const scores = [0, 0];
    let round = 0;
    let phase: Phase = 'countdown';
    /** Tick at which the current phase ends. */
    let phaseEnds = 0;
    let banner: DisplayText | undefined;
    let result: ModeState['result'];

    /** Living characters of each team (index 0 is team 1). */
    const survivors = () => {
      const alive = [0, 0];
      for (const participant of api.participants()) {
        const character = api.characterOf(participant.id);
        const index = participant.team - 1;
        if (character?.alive && index >= 0 && index < 2) alive[index] = (alive[index] ?? 0) + 1;
      }
      return alive as [number, number];
    };

    const startRound = () => {
      round++;
      api.clearWorld();
      for (const participant of api.participants()) api.spawn(participant.id);
      api.setFrozen(true);
      phase = 'countdown';
      phaseEnds = api.tick + COUNTDOWN_TICKS;
    };

    /** `winner` is a team number, or undefined for a draw. */
    const endRound = (winner: number | undefined) => {
      if (winner !== undefined) scores[winner - 1] = (scores[winner - 1] ?? 0) + 1;
      api.setFrozen(true);
      phase = 'roundOver';
      phaseEnds = api.tick + ROUND_OVER_TICKS;
      banner = winner === undefined ? key('roundDraw') : key('roundWon', { team: winner });
    };

    const endMatchIfDecided = (): boolean => {
      const [a, b] = scores as [number, number];
      if (a < settings.roundsToWin && b < settings.roundsToWin && round < maxRounds) return false;
      const winner = a > b ? 1 : b > a ? 2 : undefined;
      phase = 'matchOver';
      result = { winner };
      banner = winner === undefined ? key('matchDraw') : key('matchWon', { team: winner });
      return true;
    };

    return {
      onMatchStart: startRound,
      // Newcomers watch until the next round (Q40); leavers' characters are removed by the host.
      onParticipantJoined: () => undefined,
      onParticipantLeft: () => undefined,
      onEvent: () => undefined,
      onTick() {
        if (phase === 'countdown') {
          banner = key('countdown', {
            round,
            seconds: Math.ceil((phaseEnds - api.tick) / TICK_RATE),
          });
          if (api.tick < phaseEnds) return;
          api.setFrozen(false);
          phase = 'playing';
          phaseEnds = api.tick + roundTicks;
          banner = undefined;
        } else if (phase === 'playing') {
          const [a, b] = survivors();
          if (a === 0 || b === 0) endRound(a > 0 ? 1 : b > 0 ? 2 : undefined);
          else if (api.tick >= phaseEnds) endRound(a > b ? 1 : b > a ? 2 : undefined);
        } else if (phase === 'roundOver' && api.tick >= phaseEnds) {
          if (!endMatchIfDecided()) startRound();
        }
      },
      state: () => ({
        round,
        timeLeft:
          phase === 'countdown'
            ? roundTicks
            : phase === 'playing'
              ? Math.max(0, phaseEnds - api.tick)
              : 0,
        teamScores: [...scores],
        ...(banner && { banner }),
        ...(result && { result }),
      }),
    };
  },
};
