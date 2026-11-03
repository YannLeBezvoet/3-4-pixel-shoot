import type { GameModeDefinition, ModeApi, SimEvent } from '@pixel-shoot/sim';
import { Button, NEUTRAL_INPUT, asciiMap, testCatalog } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createMatchHost } from './match-host';

const map = asciiMap(`
  ############
  #11......22#
  #11......22#
  ############
`);

/** A mode that spawns everyone at start, records what it sees and ends at a given tick. */
function recordingMode(endAt = Infinity) {
  const seen: string[] = [];
  let api: ModeApi | undefined;
  const mode: GameModeDefinition<{ friendlyFire: boolean }> = {
    id: 'recording',
    nameKey: 'mode.recording',
    settings: z.object({ friendlyFire: z.boolean().default(false) }),
    mapRequirements: { teams: 2 },
    rules: (settings) => ({ friendlyFire: settings.friendlyFire }),
    create(modeApi) {
      api = modeApi;
      return {
        onMatchStart: () => {
          seen.push('start');
          for (const p of modeApi.participants()) modeApi.spawn(p.id);
        },
        onEvent: (event: SimEvent) => seen.push(event.type),
        onTick: () => undefined,
        onParticipantJoined: (id) => seen.push(`joined ${id}`),
        onParticipantLeft: (id) => seen.push(`left ${id}`),
        state: () => (modeApi.tick >= endAt ? { result: { winner: 1 } } : { round: 1 }),
      };
    },
  };
  return { mode, seen, api: () => api! };
}

function match(endAt?: number) {
  const recording = recordingMode(endAt);
  const host = createMatchHost({ map, catalog: testCatalog(), mode: recording.mode, seed: 'm' });
  const red = host.addParticipant({
    name: { key: 'participant.you' },
    team: 1,
    character: 'rifleman',
    kind: 'human',
  });
  const blue = host.addParticipant({
    name: { key: 'participant.bot', params: { n: 1 } },
    team: 2,
    character: 'rifleman',
    kind: 'bot',
  });
  return { host, red, blue, ...recording };
}

describe('MatchHost', () => {
  it('starts the mode, which spawns participants in their team areas', () => {
    const { host, red, blue, seen } = match();
    host.start();
    const view = host.view();
    const at = (id: number) =>
      view.actors.find((a) => a.id === view.participants.find((p) => p.id === id)?.entity);
    expect(at(red)?.team).toBe(1);
    expect(at(red)!.x).toBeLessThan(144);
    expect(at(blue)!.x).toBeGreaterThan(432);
    // Characters face the middle of the map.
    expect(Math.cos(at(red)!.aim)).toBeGreaterThan(0.9);
    expect(seen).toEqual(['start']);
    host.step();
    expect(seen).toEqual(['start', 'actorSpawned', 'actorSpawned']);
  });

  it('drives characters with the inputs submitted for their participant', () => {
    const { host, red } = match();
    host.start();
    const entity = () => host.view().participants.find((p) => p.id === red)!.entity!;
    const x0 = host.view().actors.find((a) => a.id === entity())!.x;
    host.submitInput(red, { ...NEUTRAL_INPUT, move: { x: 1, y: 0 } });
    for (let i = 0; i < 30; i++) host.step();
    expect(host.view().actors.find((a) => a.id === entity())!.x).toBeGreaterThan(x0 + 50);
    expect(host.tick).toBe(30);
  });

  it('counts kills and deaths per participant', () => {
    const { host, red, blue } = match();
    host.start();
    const view = host.view();
    const redActor = view.actors.find((a) => a.id === view.participants[0]!.entity)!;
    const blueActor = view.actors.find((a) => a.id === view.participants[1]!.entity)!;
    const aim = Math.atan2(blueActor.y - redActor.y, blueActor.x - redActor.x);
    host.submitInput(red, { ...NEUTRAL_INPUT, aim, buttons: Button.fire });
    for (let i = 0; i < 120; i++) host.step();
    const participants = host.view().participants;
    expect(participants.find((p) => p.id === red)).toMatchObject({ kills: 1, deaths: 0 });
    expect(participants.find((p) => p.id === blue)).toMatchObject({ kills: 0, deaths: 1 });
  });

  it('tells the mode about late arrivals and departures, and removes their character', () => {
    const { host, blue, seen } = match();
    host.start();
    const late = host.addParticipant({
      name: { text: 'Late' },
      team: 2,
      character: 'rifleman',
      kind: 'human',
    });
    host.removeParticipant(blue);
    expect(seen).toEqual(['start', `joined ${late}`, `left ${blue}`]);
    expect(host.view().participants.map((p) => p.id)).toEqual([1, late]);
    expect(host.view().actors).toHaveLength(1);
  });

  it('applies the mode settings and validates them', () => {
    const recording = recordingMode();
    expect(() =>
      createMatchHost({
        map,
        catalog: testCatalog(),
        mode: recording.mode,
        seed: 1,
        settings: { friendlyFire: 'yes' },
      }),
    ).toThrow();
    const { host } = match();
    expect(() =>
      host.addParticipant({ name: { text: 'X' }, team: 1, character: 'tank', kind: 'human' }),
    ).toThrow('Unknown character "tank".');
  });

  it('finishes when the mode declares a result', () => {
    const { host } = match(3);
    host.start();
    host.step();
    expect(host.finished).toBe(false);
    host.step();
    host.step();
    expect(host.finished).toBe(true);
    expect(host.view().mode.result).toEqual({ winner: 1 });
  });

  it('lets the mode clear the world and freeze characters', () => {
    const { host, red, api } = match();
    host.start();
    api().setFrozen(true);
    host.submitInput(red, { ...NEUTRAL_INPUT, move: { x: 1, y: 0 } });
    const before = api().characterOf(red)!.x;
    host.step();
    expect(api().characterOf(red)!.x).toBe(before);
    api().clearWorld();
    expect(api().characterOf(red)).toBeUndefined();
    expect(host.view().actors).toEqual([]);
  });

  it('replaces the map of a running match, bots included', () => {
    const { host, api } = match();
    host.start();
    const walled = asciiMap(`
      ############
      #11...#..22#
      #11...#..22#
      ############
    `);
    host.replaceMap(walled);
    expect(host.map).toBe(walled);
    expect(api().map).toBe(walled);
    // The bot keeps playing on the new map without error.
    for (let i = 0; i < 120; i++) host.step();
    expect(host.view().actors.every((a) => a.x < 6 * 48 || a.x > 7 * 48)).toBe(true);
  });
});
