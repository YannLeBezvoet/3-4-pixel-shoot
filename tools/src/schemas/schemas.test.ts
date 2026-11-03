import { describe, expect, it } from 'vitest';
import { renderSchemas } from './cli';

describe('renderSchemas', () => {
  it('produces one schema per theme file, with behavior parameters for editors', () => {
    const schemas = renderSchemas();
    expect([...schemas.keys()]).toEqual([
      'schemas/theme.schema.json',
      'schemas/characters.schema.json',
      'schemas/weapons.schema.json',
      'schemas/projectiles.schema.json',
      'schemas/effects.schema.json',
    ]);
    const projectiles = schemas.get('schemas/projectiles.schema.json') as string;
    expect(projectiles).toContain('"const": "bullet"');
    expect(projectiles).toContain('"range"');
    const weapons = schemas.get('schemas/weapons.schema.json') as string;
    expect(weapons).toContain('"roundsPerMinute"');
    expect(weapons).toContain('"const": "firearm"');
    expect(JSON.parse(weapons).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });
});
