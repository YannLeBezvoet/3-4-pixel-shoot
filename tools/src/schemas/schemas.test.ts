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
      'tools/tiled/pixel-shoot.tiled-project',
      'docs/reference/behaviors.md',
    ]);
    const projectiles = schemas.get('schemas/projectiles.schema.json') as string;
    expect(projectiles).toContain('"const": "bullet"');
    expect(projectiles).toContain('"range"');
    const weapons = schemas.get('schemas/weapons.schema.json') as string;
    expect(weapons).toContain('"roundsPerMinute"');
    expect(weapons).toContain('"const": "firearm"');
    expect(JSON.parse(weapons).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  it('gives Tiled the layer classes, tile flags and spawn team the map loader reads', () => {
    const project = JSON.parse(renderSchemas().get('tools/tiled/pixel-shoot.tiled-project')!);
    const types = new Map(
      (project.propertyTypes as { name: string; useAs: string[]; members: { name: string }[] }[]).map(
        (t) => [t.name, t],
      ),
    );
    expect([...types.keys()]).toEqual(['map', 'tile', 'ground', 'overhead', 'objects', 'gameplay', 'spawn']);
    expect(types.get('tile')?.members).toEqual([
      { name: 'solid', type: 'bool', value: false },
      { name: 'impassable', type: 'bool', value: false },
      { name: 'cover', type: 'bool', value: false },
      { name: 'bulletPassPercent', type: 'int', value: 0 },
      { name: 'low', type: 'bool', value: false },
      { name: 'hp', type: 'int', value: 0 },
      { name: 'damageFilter', type: 'string', value: '' },
      { name: 'destroyedTile', type: 'int', value: -1 },
      { name: 'flammable', type: 'bool', value: false },
      { name: 'burntTile', type: 'int', value: -1 },
      { name: 'explosive', type: 'bool', value: false },
      { name: 'blastRadius', type: 'int', value: 144 },
      { name: 'blastDamage', type: 'int', value: 120 },
    ]);
    expect(types.get('spawn')).toMatchObject({ useAs: ['object'], members: [{ name: 'team', type: 'int', value: 1 }] });
    expect(types.get('ground')?.useAs).toEqual(['layer']);
    expect(project.folders).toEqual(['../../themes']);
  });

  it('documents every behavior and its parameters', () => {
    const reference = renderSchemas().get('docs/reference/behaviors.md')!;
    expect(reference).toContain('### `firearm`');
    expect(reference).toContain('| `magazine` | whole number ≥ 1 | required | Rounds per magazine. |');
    expect(reference).toContain('| `spreadDeg` | number ≥ 0, ≤ 45 | `0` |');
    expect(reference).toContain('| `reserveMagazines` | whole number ≥ 0 or `null` | `null` |');
    expect(reference).toContain('### `bullet`');
    expect(reference).toContain('| `speed` | number > 0, ≤ 6000 | required |');
    expect(reference).toContain('### `flamethrower`');
    expect(reference).toContain('### `thrown`');
    expect(reference).toContain('### `grenade`');
    expect(reference).toContain('### `flame`');
    expect(reference).toContain('## Map elements');
    expect(reference).toContain('| `damageFilter` | string | `""` |');
  });
});
