import { describe, expect, it } from 'vitest';
import { builtInBehaviors } from './built-in';
import { createBehaviorRegistry } from './registry';
import { firearm } from './weapons/firearm';

describe('behavior registry', () => {
  it('finds behaviors by kind and id', () => {
    expect(builtInBehaviors.get('weapon', 'firearm')).toBe(firearm);
    expect(builtInBehaviors.get('projectile', 'firearm')).toBeUndefined();
    expect(builtInBehaviors.list('weapon').map((b) => b.id)).toEqual(['firearm', 'thrown']);
  });

  it('refuses duplicate registrations', () => {
    expect(() => createBehaviorRegistry([firearm, firearm])).toThrow('registered twice');
  });
});

describe('firearm parameters', () => {
  const valid = {
    fireMode: 'auto',
    roundsPerMinute: 750,
    damage: 28,
    magazine: 20,
    reloadMs: 2200,
  };

  it('apply defaults', () => {
    expect(firearm.params.parse(valid)).toEqual({ ...valid, spreadDeg: 0, reserveMagazines: null });
  });

  it('reject invalid values and unknown fields', () => {
    expect(firearm.params.safeParse({ ...valid, magazine: 0 }).success).toBe(false);
    expect(firearm.params.safeParse({ ...valid, damage: 2.5 }).success).toBe(false);
    expect(firearm.params.safeParse({ ...valid, fireMode: 'burst' }).success).toBe(false);
    expect(firearm.params.safeParse({ ...valid, colour: 'red' }).success).toBe(false);
  });
});
