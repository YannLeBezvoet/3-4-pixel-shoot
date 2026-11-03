// Firearm: a gun that fires projectiles from a magazine. Firing logic arrives in milestone 1;
// the parameter schema exists from milestone 0 so themes can already be validated.
import { z } from 'zod';
import type { BehaviorDefinition } from '../registry';

export const firearmParams = z.strictObject({
  fireMode: z
    .enum(['auto', 'semi'])
    .describe('"auto" fires while the button is held; "semi" fires once per click.'),
  roundsPerMinute: z.number().positive().max(3000).describe('Maximum rate of fire.'),
  damage: z.int().positive().describe('Hit points removed by one projectile.'),
  spreadDeg: z
    .number()
    .min(0)
    .max(45)
    .default(0)
    .describe('Random deviation of each shot, in degrees on each side of the aim.'),
  magazine: z.int().min(1).describe('Rounds per magazine.'),
  reloadMs: z.int().min(0).describe('Reload duration in milliseconds.'),
  reserveMagazines: z
    .int()
    .min(0)
    .nullable()
    .default(null)
    .describe('Spare magazines per life; null means unlimited.'),
});

export type FirearmParams = z.infer<typeof firearmParams>;

export const firearm: BehaviorDefinition<FirearmParams> = {
  kind: 'weapon',
  id: 'firearm',
  description:
    'A gun firing projectiles from a magazine, with a rate of fire, spread and reload time.',
  params: firearmParams,
};
