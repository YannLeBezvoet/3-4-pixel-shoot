// The DOM interface layer: 960×540 CSS pixels, scaled and placed exactly over the canvas,
// so 1 interface pixel = 1 game pixel (decision 0004).
import type { ComponentChildren } from 'preact';
import type { ReadonlySignal } from '@preact/signals';
import type { ScreenLayout } from '../render/screen-layout';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from '../render/screen-layout';

export function UiLayer({
  layout,
  children,
}: {
  layout: ReadonlySignal<ScreenLayout>;
  children: ComponentChildren;
}) {
  const { cssLeft, cssTop, cssWidth } = layout.value;
  return (
    <div
      class="ui-layer"
      style={{
        left: `${cssLeft}px`,
        top: `${cssTop}px`,
        width: `${INTERNAL_WIDTH}px`,
        height: `${INTERNAL_HEIGHT}px`,
        transform: `scale(${cssWidth / INTERNAL_WIDTH})`,
      }}
    >
      {children}
    </div>
  );
}
