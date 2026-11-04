import { describe, expect, it } from 'vitest';
import { bloodPool, woundEffects } from './blood';

describe('the blood setting (Q32, Q66, C2.6)', () => {
  it('full: sprays, decals and pools', () => {
    expect(woundEffects('full', 'bullet')).toEqual({ sprayScale: 1, impact: false, decal: true });
    expect(bloodPool('full', 'bullet')).toBe(true);
    expect(bloodPool('full', 'explosion')).toBe(true);
  });

  it('reduced: smaller sprays, no decals or pools', () => {
    expect(woundEffects('reduced', 'bullet')).toEqual({
      sprayScale: 0.5,
      impact: false,
      decal: false,
    });
    expect(bloodPool('reduced', 'bullet')).toBe(false);
  });

  it('off: no blood, hits show the impact effect', () => {
    expect(woundEffects('off', 'bullet')).toEqual({ sprayScale: 0, impact: true, decal: false });
    expect(bloodPool('off', 'bullet')).toBe(false);
  });

  it('fire never bleeds', () => {
    for (const setting of ['full', 'reduced', 'off'] as const) {
      expect(woundEffects(setting, 'fire')).toEqual({
        sprayScale: 0,
        impact: false,
        decal: false,
      });
      expect(bloodPool(setting, 'fire')).toBe(false);
    }
  });
});
