// Dev page /dev/sprites: every sprite of every theme, its animations, the 8 directions and the
// weapon following the mouse. Reacts to content reloads and keeps the current selection.
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { ReadonlySignal } from '@preact/signals';
import type { ContentStore } from '../../content/content-store';
import type { SpriteViewerScene, ViewerSelection } from '../../render/sprite-viewer-scene';
import { ROW_OCTANTS, VIEWER_LAYOUT } from '../../render/sprite-viewer-scene';
import { useTranslator } from '../../ui/translator-context';

type Choice = {
  readonly themeId: string;
  readonly kind: 'character' | 'sheet';
  readonly id: string;
};

const unique = (items: readonly string[]) => [...new Set(items)];

export function SpriteViewerPage({
  store,
  scene,
  info,
}: {
  store: ContentStore;
  scene: SpriteViewerScene;
  info: ReadonlySignal<{ tag: string; frame: number }>;
}) {
  const translator = useTranslator();
  const { t } = translator;
  const choice = useSignal<Choice | undefined>(undefined);
  const animation = useSignal<string | undefined>(undefined);

  const themes = [...store.themes.value.values()];
  const current =
    choice.value ??
    (themes[0]
      ? {
          themeId: themes[0].theme.id,
          kind: 'character' as const,
          id: [...themes[0].theme.characters.keys()][0] ?? '',
        }
      : undefined);
  const assets = current ? store.themes.value.get(current.themeId) : undefined;
  const character =
    current?.kind === 'character' ? assets?.theme.characters.get(current.id) : undefined;
  const body = character
    ? assets?.sheets.get(character.sprite)
    : current?.kind === 'sheet'
      ? assets?.sheets.get(current.id)
      : undefined;
  const animations = body
    ? current?.kind === 'character'
      ? unique([...body.sheet.animations.values()].map((a) => a.action))
      : [...body.sheet.animations.keys()]
    : [];
  const selectedAnimation =
    animation.value && animations.includes(animation.value)
      ? animation.value
      : animations.includes('walk')
        ? 'walk'
        : animations[0];

  // The selection is derived during render and applied after each render.
  const selection = ((): ViewerSelection => {
    const themesNow = store.themes.value;
    let selection: ViewerSelection = { kind: 'none' };
    const a = current ? themesNow.get(current.themeId) : undefined;
    if (a && current?.kind === 'character' && character) {
      const bodySheet = a.sheets.get(character.sprite);
      const weapon = a.theme.weapons.get(character.weapon);
      const weaponSheet = weapon ? a.sheets.get(weapon.sprite) : undefined;
      if (bodySheet) {
        selection = {
          kind: 'character',
          look: {
            key: `${a.theme.id}/${bodySheet.ref}`,
            body: bodySheet,
            ...(weaponSheet
              ? { weapon: { key: `${a.theme.id}/${weaponSheet.ref}`, sheet: weaponSheet } }
              : {}),
          },
          action: selectedAnimation ?? 'idle',
        };
      }
    } else if (a && current?.kind === 'sheet') {
      const loaded = a.sheets.get(current.id);
      if (loaded)
        selection = {
          kind: 'sheet',
          key: `${a.theme.id}/${loaded.ref}`,
          loaded,
          tag: selectedAnimation,
        };
    }
    return selection;
  })();
  useEffect(() => scene.select(selection));

  const pick = (next: Choice) => {
    choice.value = next;
    animation.value = undefined;
  };
  const isPicked = (c: Choice) =>
    current?.themeId === c.themeId && current.kind === c.kind && current.id === c.id;

  return (
    <main class="screen sprite-viewer">
      <aside class="viewer-panel">
        <h1>{t('dev.spriteViewer')}</h1>
        <a href="/">{t('dev.back')}</a>
        {themes.length === 0 && <p>{t('dev.viewer.noTheme')}</p>}
        {themes.map(({ theme, sheets }) => {
          const characterSprites = new Set([...theme.characters.values()].map((c) => c.sprite));
          return (
            <section key={theme.id}>
              <h2>{translator.themeText(theme, theme.nameKey)}</h2>
              <h3>{t('dev.viewer.characters')}</h3>
              {[...theme.characters.values()].map((c) => {
                const option: Choice = { themeId: theme.id, kind: 'character', id: c.id };
                return (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={isPicked(option)}
                    onClick={() => pick(option)}
                  >
                    {translator.themeText(theme, c.nameKey)}
                  </button>
                );
              })}
              <h3>{t('dev.viewer.otherSprites')}</h3>
              {[...sheets.keys()]
                .filter((ref) => !characterSprites.has(ref))
                .map((ref) => {
                  const option: Choice = { themeId: theme.id, kind: 'sheet', id: ref };
                  return (
                    <button
                      type="button"
                      key={ref}
                      aria-pressed={isPicked(option)}
                      onClick={() => pick(option)}
                    >
                      {ref.split('/').pop()}
                    </button>
                  );
                })}
            </section>
          );
        })}
        {animations.length > 0 && (
          <section>
            <h3>{t('dev.viewer.animations')}</h3>
            {animations.map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={name === selectedAnimation}
                onClick={() => (animation.value = name)}
              >
                {name}
              </button>
            ))}
          </section>
        )}
      </aside>
      <p class="viewer-hint" style={{ left: `${VIEWER_LAYOUT.live.x - 160}px`, top: '40px' }}>
        {current?.kind === 'character' ? t('dev.viewer.aimHint') : ''}
      </p>
      <p
        class="viewer-info"
        style={{ left: `${VIEWER_LAYOUT.live.x - 160}px`, top: `${VIEWER_LAYOUT.live.y + 16}px` }}
      >
        {info.value.tag
          ? t('dev.viewer.frame', { tag: info.value.tag, frame: info.value.frame })
          : ''}
      </p>
      {current?.kind === 'character' && (
        <>
          <p
            class="viewer-row-title"
            style={{ left: `${VIEWER_LAYOUT.row.x0 - 24}px`, top: `${VIEWER_LAYOUT.row.y - 72}px` }}
          >
            {t('dev.viewer.directions')}
          </p>
          {ROW_OCTANTS.map((octant, i) => (
            <span
              key={octant}
              class="viewer-direction"
              style={{
                left: `${VIEWER_LAYOUT.row.x0 + i * VIEWER_LAYOUT.row.step - 24}px`,
                top: `${VIEWER_LAYOUT.row.y + 8}px`,
              }}
            >
              {t(`direction.${octant}`)}
              {['nw', 'w', 'sw'].includes(octant) && <small>{t('dev.viewer.mirrored')}</small>}
            </span>
          ))}
        </>
      )}
    </main>
  );
}
