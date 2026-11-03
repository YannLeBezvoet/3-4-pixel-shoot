import { render } from 'preact';
import type { ReadonlySignal } from '@preact/signals';
import type { Translator } from '../i18n/translator';
import type { ScreenLayout } from '../render/screen-layout';
import { HomeScreen } from './home-screen';
import { TranslatorContext } from './translator-context';
import { UiLayer } from './ui-layer';

export interface UiOptions {
  readonly host: HTMLElement;
  readonly layout: ReadonlySignal<ScreenLayout>;
  readonly translator: Translator;
  readonly devPages: readonly { path: string; titleKey: string }[];
}

export function mountUi({ host, layout, translator, devPages }: UiOptions): void {
  const root = document.createElement('div');
  host.append(root);
  render(
    <TranslatorContext.Provider value={translator}>
      <UiLayer layout={layout}>
        <HomeScreen devPages={devPages} />
      </UiLayer>
    </TranslatorContext.Provider>,
    root,
  );
}
