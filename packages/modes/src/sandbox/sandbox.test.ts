import { createMatchHost } from '@pixel-shoot/match';
import { Button, NEUTRAL_INPUT, asciiMap, testCatalog } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { sandbox } from './sandbox';

describe('sandbox mode', () => {
  it('spawns everyone and brings the dead back after 2 seconds', () => {
    const host = createMatchHost({
      map: asciiMap('#1....2#'),
      catalog: testCatalog({ weapon: { damage: 100 } }),
      mode: sandbox,
      seed: 's',
    });
    const shooter = host.addParticipant({
      name: { text: 'A' },
      team: 1,
      character: 'rifleman',
      kind: 'human',
    });
    host.addParticipant({ name: { text: 'B' }, team: 2, character: 'rifleman', kind: 'human' });
    host.start();
    expect(host.view().actors).toHaveLength(2);
    host.submitInput(shooter, { ...NEUTRAL_INPUT, aim: 0, buttons: Button.fire });
    let deathTick = 0;
    for (let i = 0; i < 30 && deathTick === 0; i++)
      if (host.step().some((e) => e.type === 'killed')) deathTick = host.tick;
    expect(deathTick).toBeGreaterThan(0);
    host.submitInput(shooter, NEUTRAL_INPUT);
    while (host.tick < deathTick + 119) host.step();
    expect(host.view().actors.filter((a) => a.alive)).toHaveLength(1);
    host.step();
    expect(host.view().actors.filter((a) => a.alive)).toHaveLength(2);
    expect(host.view().mode).toEqual({});
    expect(host.finished).toBe(false);
  });
});
