import { describe, expect, it } from 'vitest';
import { asciiMap } from '../testing/ascii-map';
import { mapSuitsMode } from './game-mode';

describe('mapSuitsMode', () => {
  it('needs spawn areas for every team of the mode', () => {
    expect(mapSuitsMode(asciiMap('1.2'), { teams: 2 })).toBe(true);
    expect(mapSuitsMode(asciiMap('1..'), { teams: 2 })).toBe(false);
    expect(mapSuitsMode(asciiMap('1..'), { teams: 1 })).toBe(true);
  });
});
