// The Vietnam theme as the settled questions describe it: what it carries, what burns, what breaks.
import { DamageFilter, createSimulation } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { loadArena } from '../bench/bot-rounds';

describe('the Vietnam theme', () => {
  it('gives each faction a rifleman and a flamethrower trooper, with grenades (Q61, Q70)', async () => {
    const { catalog } = await loadArena();
    for (const [id, weapon, throwable] of [
      ['us-rifleman', 'firearm', 'm26'],
      ['us-flamethrower', 'flamethrower', 'm26'],
      ['pavn-rifleman', 'firearm', 'type-67'],
      ['pavn-flamethrower', 'flamethrower', 'type-67'],
    ] as const) {
      const character = catalog.characters.get(id);
      expect(catalog.weapons.get(character?.weapon ?? '')?.behavior, id).toBe(weapon);
      expect(character?.throwable, id).toBe(throwable);
    }
    const m26 = catalog.weapons.get('m26');
    expect(m26?.params).toMatchObject({ count: 2, maxRange: 384 });
    expect(catalog.projectiles.get('m26-grenade')?.params).toMatchObject({
      fuseMs: 2500,
      blastRadius: 144,
      blastDamage: 120,
    });
    expect(catalog.projectiles.get('flame-jet')?.params).toMatchObject({ range: 192 });
    expect(catalog.fire).toMatchObject({
      burnTicks: 300,
      characterBurnTicks: 180,
      characterDamagePerSecond: 8,
    });
  });

  it('has the map elements of Q33 and Q63 on its map', async () => {
    const { map, catalog } = await loadArena();
    const bySandbags = map.objects.filter((o) => o.low);
    expect(bySandbags.length).toBeGreaterThan(0);
    for (const sandbags of bySandbags)
      expect(sandbags.element).toEqual({ hp: 200, damageFilter: DamageFilter.explosion });

    const barrels = map.objects.filter((o) => o.element?.explosive);
    expect(barrels).toHaveLength(5);
    for (const barrel of barrels) expect(barrel.element?.hp).toBe(30);

    const hitPoints = new Set(map.tileTypes.map((t) => t.element?.hp));
    for (const hp of [40, 60, 80]) expect(hitPoints).toContain(hp);

    const sim = createSimulation({ map, catalog, seed: 'vietnam' });
    expect(sim.elements().length).toBeGreaterThan(200);
  });

  it('does not burn grass, floors or trees (Q63)', async () => {
    const { map } = await loadArena();
    const flammable = map.tileTypes.filter((t) => t.element?.flammable).length;
    // Tall grass on both grounds (Q78), thatch roofs and their edge, bamboo walls, crates, fences.
    expect(flammable).toBe(7);
    expect(map.objects.some((o) => !o.low && !o.element && o.footprints.length > 0)).toBe(true);
    expect(map.objects.some((o) => o.element?.flammable)).toBe(false);
  });
});
