// Builds the dev scene: a sandbox match on the first map of the first theme that has one, the
// local player in team 1 against three bots in team 2, who come looking for it. Everyone comes
// back 2 seconds after dying.
import { signal } from '@preact/signals';
import { buildCatalog } from '@pixel-shoot/content';
import { createMatchHost } from '@pixel-shoot/match';
import { sandbox } from '@pixel-shoot/modes';
import type { Catalog } from '@pixel-shoot/sim';
import type { ContentStore, ThemeAssets } from '../../content/content-store';
import { hudTexts } from '../../i18n/hud-texts';
import type { Translator } from '../../i18n/translator';
import { createGameInput } from '../../input/game-input';
import { Hud } from '../../render/hud';
import { loadPixelFont } from '../../render/pixel-text';
import type { Renderer } from '../../render/renderer';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from '../../render/screen-layout';
import { SheetTextures } from '../../render/sheet-textures';
import { themeLooks } from '../../render/theme-looks';
import { WorldScene } from '../../render/world-scene';
import { createLocalSession } from '../../session/local-session';
import type { Session } from '../../session/session';
import { ScenePage } from './scene-page';

const BOTS = 3;

interface Match {
  readonly session: Session;
  readonly catalog: Catalog;
  readonly assets: ThemeAssets;
}

function startMatch(assets: ThemeAssets): Match | undefined {
  const [map] = assets.maps.values();
  if (!map) return undefined;
  const { theme } = assets;
  const catalog = buildCatalog(theme);
  const characterOf = (team: number) => {
    const faction = theme.factions[(team - 1) % theme.factions.length]?.id;
    return [...theme.characters.values()].find((c) => c.faction === faction)?.id ?? '';
  };
  const host = createMatchHost({ map, catalog, mode: sandbox, seed: 'dev-scene' });
  const me = host.addParticipant({
    name: { key: 'participant.you' },
    team: 1,
    character: characterOf(1),
    kind: 'human',
  });
  for (let n = 1; n <= BOTS; n++)
    host.addParticipant({
      name: { key: 'participant.bot', params: { n } },
      team: 2,
      character: characterOf(2),
      kind: 'bot',
    });
  host.start();
  return { session: createLocalSession(host, me), catalog, assets };
}

export async function createDevScene(
  renderer: Renderer,
  store: ContentStore,
  translator: Translator,
) {
  const scene = new WorldScene(new SheetTextures());
  const hud = new Hud(await loadPixelFont());
  renderer.app.stage.addChild(scene.root, hud.root);
  renderer.app.canvas.classList.add('in-match');
  const input = createGameInput(renderer.layout);
  const status = signal<'loading' | 'no-map' | 'playing'>('loading');
  let match: Match | undefined;

  const begin = () => {
    if (match) return;
    const assets = [...store.themes.value.values()].find((a) => a.maps.size > 0);
    if (!assets) {
      status.value = store.themes.value.size > 0 ? 'no-map' : 'loading';
      return;
    }
    match = startMatch(assets);
    if (!match) return;
    const [map] = assets.maps.values();
    scene.setMap(map!, assets.images);
    scene.setLooks(themeLooks(assets));
    status.value = 'playing';
  };
  begin();
  store.themes.subscribe(begin);

  renderer.app.ticker.add((ticker) => {
    if (!match) return;
    const { session, catalog, assets } = match;
    const view = session.frame().current;
    const entity = view.participants.find((p) => p.id === session.localParticipant)?.entity;
    const actor = view.actors.find((a) => a.id === entity);
    const gunHeight = actor ? (catalog.characters.get(actor.character)?.gunHeight ?? 0) : 0;
    const origin = actor
      ? scene.toScreen(actor.x, actor.y - gunHeight)
      : { x: INTERNAL_WIDTH / 2, y: INTERNAL_HEIGHT / 2 };
    const command = input.command(origin);
    session.sendInput(command);
    const events = session.advance(ticker.deltaMS);
    const frame = session.frame();
    scene.playEvents(events, frame);
    scene.draw(frame, ticker.deltaMS, {
      focus: entity,
      ...(entity !== undefined && actor?.alive && { liveAim: { entity, angle: command.aim } }),
    });
    hud.update({
      view: frame.current,
      local: session.localParticipant,
      followed: entity,
      events,
      pointer: input.pointer(),
      toScreen: (x, y) => scene.toScreen(x, y),
      texts: hudTexts(translator, assets.theme),
      deltaMs: ticker.deltaMS,
    });
  });

  return <ScenePage status={status} />;
}
