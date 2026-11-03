// Player preferences kept in the browser: the palette pass (Q14), on by default. The language
// is kept by the translator.
import type { Signal } from '@preact/signals';
import { signal } from '@preact/signals';

const PALETTE_PASS_KEY = 'pixel-shoot.palette-pass';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be refused (private windows): the choice then lasts until the page closes.
  }
}

export interface Preferences {
  readonly palettePass: Signal<boolean>;
}

export function createPreferences(): Preferences {
  const palettePass = signal(read(PALETTE_PASS_KEY) !== 'off');
  palettePass.subscribe((on) => write(PALETTE_PASS_KEY, on ? 'on' : 'off'));
  return { palettePass };
}
