// The Vietnam theme as the settled questions describe it: what it carries, what burns, what breaks.
import type { MapObject } from '@pixel-shoot/sim';
import { DamageFilter, TileFlag, createSimulation } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { loadArena } from '../bench/bot-rounds';

const isFence = (object: MapObject) => object.visual?.image === 'tilesets/fence.png';
/** What burns and breaks is broken by bullets and blasts; flames only set it alight (Q79). */
const NOT_FIRE = DamageFilter.bullet | DamageFilter.explosion;

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

    const destructible = map.tileTypes.filter((t) => t.element?.hp !== undefined);
    expect(destructible.map((t) => t.element?.hp).sort()).toEqual([60, 80]);
    for (const tile of destructible)
      expect(tile.element).toMatchObject({ flammable: true, damageFilter: NOT_FIRE });

    const sim = createSimulation({ map, catalog, seed: 'vietnam' });
    expect(sim.elements().length).toBeGreaterThan(200);
  });

  it('has fences that are cover, break and burn (Q29, Q33, Q63, Q79)', async () => {
    const { map } = await loadArena();
    const fences = map.objects.filter(isFence);
    expect(fences.length).toBeGreaterThan(0);
    for (const fence of fences) {
      expect(fence.element).toMatchObject({ hp: 40, flammable: true, damageFilter: NOT_FIRE });
      expect(fence.low).toBeFalsy();
      expect(fence.destroyedVisual).toBeDefined();
      expect(fence.burntVisual).toBeDefined();
      expect(fence.footprints).toHaveLength(1);
      expect(fence.footprints[0]).toMatchObject({ flags: TileFlag.cover, bulletPassPercent: 70 });
    }
  });

  it('does not burn grass, floors or trees (Q63)', async () => {
    const { map } = await loadArena();
    const flammable = map.tileTypes.filter((t) => t.element?.flammable).length;
    // Tall grass on both grounds (Q78), thatch roofs and their edge, bamboo walls, crates.
    expect(flammable).toBe(6);
    expect(map.objects.some((o) => !o.low && !o.element && o.footprints.length > 0)).toBe(true);
    expect(map.objects.filter((o) => o.element?.flammable).every(isFence)).toBe(true);
  });
});
