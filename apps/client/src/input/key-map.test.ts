import { describe, expect, it } from 'vitest';
import { isGameKey, moveFromKeys } from './key-map';

const move = (...codes: string[]) => moveFromKeys(new Set(codes));

describe('moveFromKeys', () => {
  it('reads physical keys: the WASD positions (ZQSD on AZERTY) and the arrows', () => {
    expect(move('KeyW')).toEqual({ x: 0, y: -1 });
    expect(move('KeyA')).toEqual({ x: -1, y: 0 });
    expect(move('ArrowDown')).toEqual({ x: 0, y: 1 });
    expect(move('ArrowRight')).toEqual({ x: 1, y: 0 });
  });

  it('gives diagonals of length 1 and cancels opposite keys', () => {
    const diagonal = move('KeyW', 'KeyD');
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(diagonal.y).toBeCloseTo(-Math.SQRT1_2, 12);
    expect(move('KeyA', 'KeyD')).toEqual({ x: 0, y: 0 });
    expect(move('KeyD', 'ArrowRight')).toEqual({ x: 1, y: 0 });
    expect(move('KeyQ', 'KeyZ')).toEqual({ x: 0, y: 0 });
  });

  it('knows which keys belong to the game', () => {
    expect(isGameKey('KeyR')).toBe(true);
    expect(isGameKey('ArrowUp')).toBe(true);
    expect(isGameKey('KeyT')).toBe(false);
  });
});
