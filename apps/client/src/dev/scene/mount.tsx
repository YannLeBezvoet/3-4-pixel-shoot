// Builds the dev scene: a sandbox match on a map (?theme=<id>&map=<ref>, by default the first
// map of the first theme that has one), the local player in team 1 against bots in team 2, who
// come looking for it. Everyone comes back 2 seconds after dying.
//
// ?participants=<n>  how many in all, split between the teams (32 for C2.7, Q69); 4 by default
// ?character=<i>     which character of its side the player plays (0 rifleman, 1 flamethrower)
// ?at=<x>,<y>        the tile where the player starts
// ?stress            the load of C2.7: everyone in a ring around the player, firing flames for
//                    ever, 10 explosions at once every second; the number of flames in flight
//                    is shown by the page
import { signal } from '@preact/signals';
import { buildCatalog } from '@pixel-shoot/content';
import type { MatchHost } from '@pixel-shoot/match';
import { createMatchHost } from '@pixel-shoot/match';
import { sandbox } from '@pixel-shoot/modes';
import type { Catalog, ParticipantId, WeaponStats } from '@pixel-shoot/sim';
import { Button, NEUTRAL_INPUT, TILE_SIZE, createCatalog } from '@pixel-shoot/sim';
import type { ContentStore, ThemeAssets } from '../../content/content-store';
import { MatchController } from '../../game/match-controller';
import type { Translator } from '../../i18n/translator';
import { loadPixelFont } from '../../render/pixel-text';
import type { Renderer } from '../../render/renderer';
import { createLocalSession } from '../../session/local-session';
import { ScenePage } from './scene-page';

const DEFAULT_PARTICIPANTS = 4;
const STRESS_PARTICIPANTS = 32;
const STRESS_RING = 150;
const STRESS_EXPLOSIONS = 10;
/** Enough flames in the air from 31 flamethrowers for the 200 of C2.7. */
const STRESS_FLAMES_PER_SECOND = 14;

/** The catalog with tanks that never run dry and a denser jet. */
function stressCatalog(catalog: Catalog): Catalog {
  const weapons = [...catalog.weapons.values()].map((weapon): WeaponStats => {
    if (weapon.behavior !== 'flamethrower') return weapon;
    const params = {
      ...weapon.params,
      tankMs: 3_600_000,
      flamesPerSecond: STRESS_FLAMES_PER_SECOND,
    };
    return { ...weapon, params };
  });
  return createCatalog({
    characters: [...catalog.characters.values()],
    weapons,
    projectiles: [...catalog.projectiles.values()],
    fire: catalog.fire,
  });
}

/** Everyone in a ring around the player, firing outward. */
function startStress(host: MatchHost, others: readonly ParticipantId[], local: ParticipantId) {
  const sim = host.simulation;
  const entityOf = (id: ParticipantId) => host.view().participants.find((p) => p.id === id)?.entity;
  const center = sim.actor(entityOf(local) ?? -1) ?? { x: 0, y: 0 };
  others.forEach((id, i) => {
    const angle = (i / others.length) * Math.PI * 2;
    const entity = entityOf(id);
    if (entity === undefined) return;
    sim.teleport(
      entity,
      center.x + Math.cos(angle) * STRESS_RING,
      center.y + Math.sin(angle) * STRESS_RING,
    );
    host.submitInput(id, { ...NEUTRAL_INPUT, aim: angle, buttons: Button.fire });
  });
  return () => {
    for (let i = 0; i < STRESS_EXPLOSIONS; i++) {
      const angle = (i / STRESS_EXPLOSIONS) * Math.PI * 2;
      sim.explode({
        x: center.x + Math.cos(angle) * 240,
        y: center.y + Math.sin(angle) * 160,
        radius: 144,
        damage: 0,
        owner: 0,
        team: 0,
        weapon: '',
        kind: undefined,
      });
    }
  };
}

export async function createDevScene(
  renderer: Renderer,
  store: ContentStore,
  translator: Translator,
) {
  const font = await loadPixelFont();
  const status = signal<'loading' | 'no-map' | 'playing'>('loading');
  const flames = signal<number | undefined>(undefined);
  let controller: MatchController | undefined;

  const begin = () => {
    if (controller) return;
    const query = new URLSearchParams(location.search);
    const wanted = query.get('theme');
    const assets: ThemeAssets | undefined = [...store.themes.value.values()].find(
      (a) => a.maps.size > 0 && (!wanted || a.theme.id === wanted),
    );
    if (!assets) {
      status.value = store.themes.value.size > 0 ? 'no-map' : 'loading';
      return;
    }
    const [mapRef, map] =
      [...assets.maps].find(([ref]) => ref === query.get('map')) ?? [...assets.maps][0]!;
    const { theme } = assets;
    const stress = query.has('stress');
    const catalog = stress ? stressCatalog(buildCatalog(theme)) : buildCatalog(theme);
    const charactersOf = (team: number) =>
      [...theme.characters.values()]
        .filter((c) => c.faction === theme.factions[(team - 1) % theme.factions.length]?.id)
        .map((c) => c.id);
    const pick = (team: number, index: number) =>
      charactersOf(team)[index] ?? charactersOf(team)[0] ?? '';
    const host = createMatchHost({ map, catalog, mode: sandbox, seed: 'dev-scene' });
    const count =
      Number(query.get('participants')) || (stress ? STRESS_PARTICIPANTS : DEFAULT_PARTICIPANTS);
    const me = host.addParticipant({
      name: { key: 'participant.you' },
      team: 1,
      character: pick(1, Number(query.get('character')) || 0),
      kind: 'human',
    });
    const others: ParticipantId[] = [];
    for (let n = 1; n < count; n++) {
      // Under stress, flamethrowers on the player's side burn nobody: their flames fly their
      // full range, and the load stays the same for the whole measurement.
      const team = stress || n % 2 === 0 ? 1 : 2;
      others.push(
        host.addParticipant({
          name: { key: 'participant.bot', params: { n } },
          team,
          character: pick(team, stress ? 1 : 0),
          kind: stress ? 'human' : 'bot',
        }),
      );
    }
    host.start();
    const [x, y] = (query.get('at') ?? '').split(',').map(Number);
    const entity = host.view().participants.find((p) => p.id === me)?.entity;
    if (entity !== undefined && x !== undefined && y !== undefined && !Number.isNaN(y))
      host.simulation.teleport(entity, (x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE);

    const explode = stress ? startStress(host, others, me) : undefined;
    if (explode) {
      setInterval(explode, 1000);
      setInterval(() => (flames.value = host.simulation.projectiles().length), 250);
    }
    controller = new MatchController({
      renderer,
      font,
      translator,
      assets,
      mapRef,
      session: createLocalSession(host, me),
      catalog,
      pausable: false,
      store,
    });
    status.value = 'playing';
  };
  begin();
  store.themes.subscribe(begin);
  return <ScenePage status={status} flames={flames} />;
}
