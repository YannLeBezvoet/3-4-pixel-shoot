import { describe, expect, it } from 'vitest';
import { loadArena, playRound } from './bot-rounds';

describe('bot-only rounds on the Vietnam map (C1.6)', () => {
  it('end by elimination, and bots only fire at enemies they see', async () => {
    const arena = await loadArena();
    const results = Array.from({ length: 10 }, (_, i) => playRound(arena, `round-${i}`));
    expect(results.filter((r) => r.end === 'elimination').length).toBeGreaterThanOrEqual(9);
    expect(results.reduce((sum, r) => sum + r.shots, 0)).toBeGreaterThan(100);
    expect(results.reduce((sum, r) => sum + r.blindShots, 0)).toBe(0);
  });

  it('are deterministic: the same seed plays the same round', async () => {
    const arena = await loadArena();
    const strip = ({ tickMs: _, ...result }: ReturnType<typeof playRound>) => result;
    expect(strip(playRound(arena, 'same', 4))).toEqual(strip(playRound(arena, 'same', 4)));
  });

  it('play on the example theme too (C1.8)', async () => {
    const arena = await loadArena('example', 'maps/arena');
    const results = Array.from({ length: 3 }, (_, i) => playRound(arena, `example-${i}`, 4));
    expect(results.every((r) => r.end === 'elimination')).toBe(true);
  });
});
