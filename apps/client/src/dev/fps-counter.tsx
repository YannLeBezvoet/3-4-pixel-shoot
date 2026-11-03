// Development overlay: frames per second, averaged by the PixiJS ticker (C1.10).
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { Renderer } from '../render/renderer';
import { useTranslator } from '../ui/translator-context';

export function FpsCounter({ renderer }: { renderer: Renderer }) {
  const { t } = useTranslator();
  const fps = useSignal(0);
  useEffect(() => {
    const timer = setInterval(() => (fps.value = Math.round(renderer.app.ticker.FPS)), 500);
    return () => clearInterval(timer);
  }, [renderer]);
  return (
    <p class="fps-counter" data-fps={fps.value}>
      {t('dev.fps', { fps: fps.value })}
    </p>
  );
}
