import type { WorldView } from '@pixel-shoot/match';
import type { ActorState } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { cycle, followed } from './spectate';

const actor = (id: number, team: number, alive: boolean) => ({ id, team, alive }) as ActorState;

function view(actors: ActorState[]): WorldView {
  return {
    tick: 0,
    actors,
    projectiles: [],
    participants: [
      {
        id: 1,
        team: 1,
        entity: 10,
        kind: 'human',
        name: { text: 'me' },
        character: 'c',
        kills: 0,
        deaths: 0,
      },
    ],
    mode: {},
  };
}

describe('spectating (Q21, Q53)', () => {
  it('follows the player while alive, then a living teammate', () => {
    expect(followed(view([actor(10, 1, true), actor(12, 1, true)]), 1, undefined)).toBe(10);
    const dead = view([
      actor(10, 1, false),
      actor(14, 1, true),
      actor(12, 1, true),
      actor(20, 2, true),
    ]);
    expect(followed(dead, 1, undefined)).toBe(12);
    expect(followed(dead, 1, 14)).toBe(14);
    expect(followed(view([actor(10, 1, false), actor(20, 2, true)]), 1, undefined)).toBe(10);
  });

  it('switches between living teammates, wrapping around', () => {
    const dead = view([
      actor(10, 1, false),
      actor(12, 1, true),
      actor(14, 1, true),
      actor(16, 1, true),
    ]);
    expect(cycle(dead, 1, 12, 1)).toBe(14);
    expect(cycle(dead, 1, 16, 1)).toBe(12);
    expect(cycle(dead, 1, 12, -1)).toBe(16);
    expect(cycle(view([actor(10, 1, false)]), 1, undefined, 1)).toBeUndefined();
  });
});
