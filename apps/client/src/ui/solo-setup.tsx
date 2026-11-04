// Solo setup (Q59): theme, map (only maps that suit team elimination), side, character (Q61),
// allied and enemy bots (16 participants at most, Q24), bot difficulty and friendly fire (Q49).
import type { DifficultyLevel } from '@pixel-shoot/bots';
import { DIFFICULTY_LEVELS } from '@pixel-shoot/bots';
import { useSignal } from '@preact/signals';
import type { SoloChoices } from '../game/solo';
import { SOLO_LIMITS, charactersOf, clampBots, soloMaps } from '../game/solo';
import { ChoiceGroup, Stepper } from './choice-group';
import { useGame } from './game-context';
import { useTranslator } from './translator-context';

export function SoloSetup() {
  const translator = useTranslator();
  const { t } = translator;
  const game = useGame();
  const themes = [...game.store.themes.value.values()].filter((a) => soloMaps(a.maps).length > 0);
  const saved = game.lastChoices;
  const initialTheme = themes.find((a) => a.theme.id === saved.themeId) ?? themes[0];
  const choices = useSignal<SoloChoices | undefined>(
    initialTheme && {
      themeId: initialTheme.theme.id,
      mapRef: soloMaps(initialTheme.maps).includes(saved.mapRef ?? '')
        ? saved.mapRef!
        : soloMaps(initialTheme.maps)[0]!,
      side: saved.side ?? 1,
      character: saved.character ?? 0,
      ...clampBots(saved.allies ?? 3, saved.enemies ?? 4),
      difficulty: saved.difficulty ?? 'normal',
      friendlyFire: saved.friendlyFire ?? false,
    },
  );
  const current = choices.value;
  const assets = current && game.store.themes.value.get(current.themeId);
  const playable = current && assets ? charactersOf(assets.theme, current.side) : [];
  const update = (change: Partial<SoloChoices>) => {
    if (current) choices.value = { ...current, ...change };
  };

  return (
    <main class="screen menu-screen solo-setup">
      <h1>{t('solo.title')}</h1>
      {!current || !assets ? (
        <p>{t('solo.noMap')}</p>
      ) : (
        <>
          <ChoiceGroup
            legend={t('solo.theme')}
            options={themes.map((a) => ({
              value: a.theme.id,
              label: translator.themeText(a.theme, a.theme.nameKey),
            }))}
            value={current.themeId}
            onChange={(themeId) => {
              const next = game.store.themes.value.get(themeId);
              if (next) update({ themeId, mapRef: soloMaps(next.maps)[0]! });
            }}
          />
          <ChoiceGroup
            legend={t('solo.map')}
            options={soloMaps(assets.maps).map((ref) => ({
              value: ref,
              label: translator.themeText(assets.theme, assets.maps.get(ref)!.nameKey),
            }))}
            value={current.mapRef}
            onChange={(mapRef) => update({ mapRef })}
          />
          <ChoiceGroup
            legend={t('solo.side')}
            options={assets.theme.factions.slice(0, 2).map((faction, i) => ({
              value: i + 1,
              label: translator.themeText(assets.theme, faction.nameKey),
            }))}
            value={current.side}
            onChange={(side) => update({ side: side === 2 ? 2 : 1 })}
          />
          {playable.length > 1 && (
            <ChoiceGroup
              legend={t('solo.character')}
              options={playable.map((id, i) => ({
                value: i,
                label: translator.themeText(
                  assets.theme,
                  assets.theme.characters.get(id)?.nameKey ?? id,
                ),
              }))}
              value={Math.min(current.character, playable.length - 1)}
              onChange={(character) => update({ character })}
            />
          )}
          <div class="row">
            <Stepper
              legend={t('solo.allies')}
              value={current.allies}
              min={0}
              max={SOLO_LIMITS.allies}
              labels={{ fewer: t('menu.fewer'), more: t('menu.more') }}
              onChange={(allies) => update(clampBots(allies, current.enemies))}
            />
            <Stepper
              legend={t('solo.enemies')}
              value={current.enemies}
              min={1}
              max={SOLO_LIMITS.enemies}
              labels={{ fewer: t('menu.fewer'), more: t('menu.more') }}
              onChange={(enemies) => update(clampBots(current.allies, enemies))}
            />
            <p class="hint">
              {t('solo.participants', { count: 1 + current.allies + current.enemies })}
            </p>
          </div>
          <ChoiceGroup<DifficultyLevel>
            legend={t('solo.difficulty')}
            options={DIFFICULTY_LEVELS.map((level) => ({
              value: level,
              label: t(`difficulty.${level}`),
            }))}
            value={current.difficulty}
            onChange={(difficulty) => update({ difficulty })}
          />
          <ChoiceGroup
            legend={t('solo.friendlyFire')}
            options={[
              { value: 'off', label: t('menu.off') },
              { value: 'on', label: t('menu.on') },
            ]}
            value={current.friendlyFire ? 'on' : 'off'}
            onChange={(value) => update({ friendlyFire: value === 'on' })}
          />
        </>
      )}
      <nav class="menu-buttons">
        <button type="button" onClick={() => game.show('menu')}>
          {t('menu.back')}
        </button>
        {current && (
          <button type="button" class="primary" onClick={() => game.startSolo(current)}>
            {t('solo.start')}
          </button>
        )}
      </nav>
    </main>
  );
}
