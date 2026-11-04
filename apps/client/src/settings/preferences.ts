// Player preferences kept in the browser: the palette pass (Q14), on by default, and the blood
// setting (Q32), full by default. The language is kept by the translator.
import type { Signal } from '@preact/signals';
import { signal } from '@preact/signals';
import type { BloodSetting } from '../render/blood';
import { BLOOD_SETTINGS } from '../render/blood';

const PALETTE_PASS_KEY = 'pixel-shoot.palette-pass';
const BLOOD_KEY = 'pixel-shoot.blood';

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
  readonly blood: Signal<BloodSetting>;
}

export function createPreferences(): Preferences {
  const palettePass = signal(read(PALETTE_PASS_KEY) !== 'off');
  palettePass.subscribe((on) => write(PALETTE_PASS_KEY, on ? 'on' : 'off'));
  const stored = read(BLOOD_KEY) as BloodSetting | null;
  const blood = signal<BloodSetting>(stored && BLOOD_SETTINGS.includes(stored) ? stored : 'full');
  blood.subscribe((value) => write(BLOOD_KEY, value));
  return { palettePass, blood };
}
