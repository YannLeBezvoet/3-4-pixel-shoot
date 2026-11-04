// What the blood setting shows (Q32, Q66). Pure: no PixiJS, so it is tested directly.
import type { DamageSource } from '@pixel-shoot/sim';

export const BLOOD_SETTINGS = ['full', 'reduced', 'off'] as const;
export type BloodSetting = (typeof BLOOD_SETTINGS)[number];

export interface WoundEffects {
  /** Size of the blood spray; 0 for none. */
  readonly sprayScale: number;
  /** Shows the projectile's impact effect instead of blood. */
  readonly impact: boolean;
  /** Paints a stain on the ground. */
  readonly decal: boolean;
}

const NOTHING: WoundEffects = { sprayScale: 0, impact: false, decal: false };

/** What a wound shows. Fire does not bleed. */
export function woundEffects(setting: BloodSetting, source: DamageSource): WoundEffects {
  if (source === 'fire') return NOTHING;
  if (setting === 'full') return { sprayScale: 1, impact: false, decal: true };
  if (setting === 'reduced') return { sprayScale: 0.5, impact: false, decal: false };
  return { sprayScale: 0, impact: true, decal: false };
}

/** Whether a pool forms under a corpse. */
export function bloodPool(setting: BloodSetting, source: DamageSource): boolean {
  return setting === 'full' && source !== 'fire';
}
