import { describe, expect, it } from 'vitest';
import { testCatalog } from '../testing/test-catalog';
import { createCatalog } from './catalog';

describe('createCatalog', () => {
  const base = testCatalog();
  const lists = {
    characters: [...base.characters.values()],
    weapons: [...base.weapons.values()],
    projectiles: [...base.projectiles.values()],
  };

  it('indexes content by id', () => {
    expect(base.characters.get('rifleman')?.weapon).toBe('rifle');
    expect(base.weapons.get('rifle')?.projectile).toBe('bullet');
    expect(base.projectiles.get('bullet')?.params.speed).toBe(1500);
  });

  it('refuses unknown references', () => {
    expect(() => createCatalog({ ...lists, weapons: [] })).toThrow(
      'Character "rifleman" uses unknown weapon "rifle".',
    );
    expect(() => createCatalog({ ...lists, projectiles: [] })).toThrow(
      'Weapon "rifle" uses unknown projectile "bullet".',
    );
  });
});
