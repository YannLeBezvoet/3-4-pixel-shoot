import type { MatchHost } from '@pixel-shoot/match';
import { createMatchHost } from '@pixel-shoot/match';
import type { ParticipantId } from '@pixel-shoot/sim';
import { Button, NEUTRAL_INPUT, TICK_RATE, asciiMap, testCatalog } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { COUNTDOWN_TICKS, ROUND_OVER_TICKS, teamElimination } from './team-elimination';

const map = asciiMap(`
  ##############
  #11........22#
  #11........22#
  ##############
`);

function match(settings: object = {}, perTeam = 1) {
  const host = createMatchHost({
    map,
    catalog: testCatalog({ weapon: { damage: 100, magazine: 100 } }),
    mode: teamElimination,
    settings,
    seed: 'te',
  });
  const add = (team: number) =>
    host.addParticipant({ name: { text: `P${team}` }, team, character: 'rifleman', kind: 'human' });
  const teams = [1, 2].map((team) => Array.from({ length: perTeam }, () => add(team)));
  host.start();
  return { host, red: teams[0]!, blue: teams[1]! };
}

const run = (host: MatchHost, ticks: number) => {
  for (let i = 0; i < ticks; i++) host.step();
};

const character = (host: MatchHost, participant: ParticipantId) => {
  const view = host.view();
  const entity = view.participants.find((p) => p.id === participant)?.entity;
  return view.actors.find((a) => a.id === entity);
};

/** Makes `shooter` fire at `target` until it dies (or a second passes). */
function kill(host: MatchHost, shooter: ParticipantId, target: ParticipantId) {
  for (let i = 0; i < TICK_RATE && character(host, target)?.alive; i++) {
    const from = character(host, shooter)!;
    const to = character(host, target)!;
    host.submitInput(shooter, {
      ...NEUTRAL_INPUT,
      aim: Math.atan2(to.y - from.y, to.x - from.x),
      buttons: Button.fire,
    });
    host.step();
  }
  host.submitInput(shooter, NEUTRAL_INPUT);
}

describe('team elimination', () => {
  it('starts each round with everyone placed and a 3-second frozen countdown (Q51)', () => {
    const { host, red } = match();
    expect(host.view().mode).toMatchObject({
      round: 1,
      teamScores: [0, 0],
      timeLeft: 180 * TICK_RATE,
    });
    expect(host.view().actors).toHaveLength(2);
    host.submitInput(red[0]!, { ...NEUTRAL_INPUT, move: { x: 1, y: 0 } });
    const x = character(host, red[0]!)!.x;
    run(host, 1);
    expect(host.view().mode.banner).toEqual({
      key: 'mode.team-elimination.countdown',
      params: { round: 1, seconds: 3 },
    });
    run(host, COUNTDOWN_TICKS - 2);
    expect(character(host, red[0]!)!.x).toBe(x);
    run(host, 2);
    expect(host.view().mode.banner).toBeUndefined();
    run(host, 10);
    expect(character(host, red[0]!)!.x).toBeGreaterThan(x);
  });

  it('gives the round to the team still standing, then starts the next round 5 s later', () => {
    const { host, red, blue } = match();
    run(host, COUNTDOWN_TICKS);
    kill(host, red[0]!, blue[0]!);
    host.step();
    expect(host.view().mode).toMatchObject({
      round: 1,
      teamScores: [1, 0],
      banner: { key: 'mode.team-elimination.roundWon', params: { team: 1 } },
    });
    run(host, ROUND_OVER_TICKS);
    const mode = host.view().mode;
    expect(mode.round).toBe(2);
    expect(host.view().actors.filter((a) => a.alive)).toHaveLength(2);
  });

  it('when time runs out, gives the round to the team with more survivors (Q21)', () => {
    const { host, red, blue } = match({ roundSeconds: 30 }, 2);
    run(host, COUNTDOWN_TICKS);
    kill(host, blue[0]!, red[0]!);
    expect(host.view().mode.teamScores).toEqual([0, 0]);
    run(host, 30 * TICK_RATE);
    expect(host.view().mode).toMatchObject({
      teamScores: [0, 1],
      banner: { key: 'mode.team-elimination.roundWon', params: { team: 2 } },
      timeLeft: 0,
    });
    expect(character(host, red[1]!)?.alive).toBe(true);
  });

  it('calls a draw when time runs out with equal survivors', () => {
    const { host } = match({ roundSeconds: 30 });
    run(host, COUNTDOWN_TICKS + 30 * TICK_RATE + 1);
    expect(host.view().mode).toMatchObject({
      teamScores: [0, 0],
      banner: { key: 'mode.team-elimination.roundDraw' },
    });
  });

  it('ends the match when a team reaches the round wins needed', () => {
    const { host, red, blue } = match({ roundsToWin: 2 });
    for (let r = 0; r < 2; r++) {
      run(host, COUNTDOWN_TICKS);
      kill(host, red[0]!, blue[0]!);
      run(host, ROUND_OVER_TICKS + 1);
    }
    expect(host.finished).toBe(true);
    expect(host.view().mode).toMatchObject({
      teamScores: [2, 0],
      result: { winner: 1 },
      banner: { key: 'mode.team-elimination.matchWon', params: { team: 1 } },
    });
    // Nothing happens after the end.
    run(host, 600);
    expect(host.view().mode.round).toBe(2);
  });

  it('stops after 3 × roundsToWin rounds, so draws cannot go on forever (Q51)', () => {
    const { host } = match({ roundsToWin: 1, roundSeconds: 30 });
    const roundTicks = COUNTDOWN_TICKS + 30 * TICK_RATE + ROUND_OVER_TICKS + 2;
    run(host, 3 * roundTicks);
    expect(host.finished).toBe(true);
    expect(host.view().mode).toMatchObject({
      round: 3,
      teamScores: [0, 0],
      result: { winner: undefined },
      banner: { key: 'mode.team-elimination.matchDraw' },
    });
  });

  it('turns friendly fire on from its settings (Q49) and validates them', () => {
    expect(teamElimination.rules(teamElimination.settings.parse({ friendlyFire: true }))).toEqual({
      friendlyFire: true,
    });
    expect(teamElimination.settings.parse({})).toEqual({
      friendlyFire: false,
      roundsToWin: 3,
      roundSeconds: 180,
    });
    expect(teamElimination.settings.safeParse({ roundsToWin: 0 }).success).toBe(false);
  });

  it('lets a late arrival watch until the next round (Q40)', () => {
    const { host, red, blue } = match();
    run(host, COUNTDOWN_TICKS);
    const late = host.addParticipant({
      name: { text: 'Late' },
      team: 2,
      character: 'rifleman',
      kind: 'human',
    });
    expect(character(host, late)).toBeUndefined();
    kill(host, red[0]!, blue[0]!);
    run(host, ROUND_OVER_TICKS + 2);
    expect(character(host, late)?.alive).toBe(true);
  });
});
