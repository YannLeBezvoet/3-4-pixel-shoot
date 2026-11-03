// Builds the dev scene: a sandbox match on the first map of the first theme that has one, the
// local player in team 1 against three bots in team 2, who come looking for it. Everyone comes
// back 2 seconds after dying.
import { signal } from '@preact/signals';
import { buildCatalog } from '@pixel-shoot/content';
import { createMatchHost } from '@pixel-shoot/match';
import { sandbox } from '@pixel-shoot/modes';
import type { ContentStore, ThemeAssets } from '../../content/content-store';
import { MatchController } from '../../game/match-controller';
import type { Translator } from '../../i18n/translator';
import { loadPixelFont } from '../../render/pixel-text';
import type { Renderer } from '../../render/renderer';
import { createLocalSession } from '../../session/local-session';
import { ScenePage } from './scene-page';

const BOTS = 3;

export async function createDevScene(
  renderer: Renderer,
  store: ContentStore,
  translator: Translator,
) {
  const font = await loadPixelFont();
  const status = signal<'loading' | 'no-map' | 'playing'>('loading');
  let controller: MatchController | undefined;

  const begin = () => {
    if (controller) return;
    const assets: ThemeAssets | undefined = [...store.themes.value.values()].find(
      (a) => a.maps.size > 0,
    );
    if (!assets) {
      status.value = store.themes.value.size > 0 ? 'no-map' : 'loading';
      return;
    }
    const [mapRef, map] = [...assets.maps][0]!;
    const { theme } = assets;
    const catalog = buildCatalog(theme);
    const characterOf = (team: number) =>
      [...theme.characters.values()].find(
        (c) => c.faction === theme.factions[(team - 1) % theme.factions.length]?.id,
      )?.id ?? '';
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
  return <ScenePage status={status} />;
}
