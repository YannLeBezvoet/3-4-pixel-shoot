import { createMatchHost } from '@pixel-shoot/match';
import { sandbox } from '@pixel-shoot/modes';
import { NEUTRAL_INPUT, asciiMap, testCatalog } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { MAX_CATCH_UP_MS, createLocalSession } from './local-session';

function session() {
  const host = createMatchHost({
    map: asciiMap('#1......#'),
    catalog: testCatalog(),
    mode: sandbox,
    seed: 1,
  });
  const me = host.addParticipant({
    name: { key: 'participant.you' },
    team: 1,
    character: 'rifleman',
    kind: 'human',
  });
  host.start();
  return { host, session: createLocalSession(host, me) };
}

describe('LocalSession', () => {
  it('runs 60 ticks per second of real time, whatever the frame rate', () => {
    for (const fps of [30, 60, 144]) {
      const { host, session: s } = session();
      for (let i = 0; i < fps; i++) s.advance(1000 / fps);
      expect(Math.abs(host.tick - 60)).toBeLessThanOrEqual(1);
    }
  });

  it('gives the interpolation factor between the last two ticks', () => {
    const { session: s } = session();
    s.advance(1000 / 60 + 4);
    const frame = s.frame();
    expect(frame.current.tick).toBe(1);
    expect(frame.previous.tick).toBe(0);
    expect(frame.alpha).toBeCloseTo(4 / (1000 / 60), 9);
  });

  it('returns the events of the ticks it ran', () => {
    const { session: s } = session();
    expect(s.advance(1).length).toBe(0);
    expect(s.advance(20).map((e) => e.type)).toEqual(['actorSpawned']);
  });

  it('applies the local input and stops while paused', () => {
    const { host, session: s } = session();
    s.sendInput({ ...NEUTRAL_INPUT, move: { x: 1, y: 0 } });
    s.advance(500);
    const x = s.frame().current.actors[0]!.x;
    expect(x).toBeGreaterThan(72);
    s.paused = true;
    const tick = host.tick;
    expect(s.advance(1000)).toEqual([]);
    expect(host.tick).toBe(tick);
  });

  it('drops time beyond the catch-up limit after a stall', () => {
    const { host, session: s } = session();
    s.advance(10_000);
    expect(host.tick).toBe(Math.round(MAX_CATCH_UP_MS / (1000 / 60)));
  });
});
