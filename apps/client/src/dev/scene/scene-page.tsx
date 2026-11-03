// Dev page /dev/scene: the controls and what is shown. The match itself is drawn on the canvas.
import type { ReadonlySignal } from '@preact/signals';
import { useTranslator } from '../../ui/translator-context';

export function ScenePage({
  status,
}: {
  status: ReadonlySignal<'loading' | 'no-map' | 'playing'>;
}) {
  const { t } = useTranslator();
  return (
    <main class="screen scene-page">
      <aside class="scene-panel">
        <a href="/">{t('dev.back')}</a>
        {status.value === 'no-map' ? (
          <p>{t('dev.scene.noMap')}</p>
        ) : (
          <p>{t('dev.scene.controls')}</p>
        )}
      </aside>
    </main>
  );
}
