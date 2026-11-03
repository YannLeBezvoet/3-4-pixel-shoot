import type { ComponentChildren } from 'preact';
import { render } from 'preact';
import type { ReadonlySignal } from '@preact/signals';
import type { Translator } from '../i18n/translator';
import type { ScreenLayout } from '../render/screen-layout';
import { TranslatorContext } from './translator-context';
import { UiLayer } from './ui-layer';

export interface UiOptions {
  readonly host: HTMLElement;
  readonly layout: ReadonlySignal<ScreenLayout>;
  readonly translator: Translator;
  readonly page: ComponentChildren;
}

export function mountUi({ host, layout, translator, page }: UiOptions): void {
  const root = document.createElement('div');
  host.append(root);
  render(
    <TranslatorContext.Provider value={translator}>
      <UiLayer layout={layout}>{page}</UiLayer>
    </TranslatorContext.Provider>,
    root,
  );
}
