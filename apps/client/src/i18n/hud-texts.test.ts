import { describe, expect, it } from 'vitest';
import { hudTexts } from './hud-texts';

const translator = {
  t: (key: string, params?: Readonly<Record<string, string | number>>) =>
    `${key}${params ? JSON.stringify(params) : ''}`,
  themeText: (_theme: unknown, key: string) => `[${key}]`,
};
const theme = {
  id: 'vietnam',
  defaultLanguage: 'en',
  factions: [
    { id: 'us-army', nameKey: 'faction.us-army' },
    { id: 'pavn', nameKey: 'faction.pavn' },
  ],
  weapons: new Map([['m16a1', { nameKey: 'weapon.m16a1.name' }]]),
} as unknown as Parameters<typeof hudTexts>[1];

describe('hudTexts', () => {
  const texts = hudTexts(translator, theme);

  it('shows a team parameter as its faction name', () => {
    expect(texts.display({ key: 'mode.roundWon', params: { team: 2 } })).toBe(
      'mode.roundWon{"team":"[faction.pavn]"}',
    );
    expect(texts.teamName(3)).toBe('3');
  });

  it('shows typed names as they are and translates keys', () => {
    expect(texts.display({ text: 'Yann' })).toBe('Yann');
    expect(texts.display({ key: 'participant.bot', params: { n: 4 } })).toBe(
      'participant.bot{"n":4}',
    );
  });

  it('names weapons from the theme', () => {
    expect(texts.weaponName('m16a1')).toBe('[weapon.m16a1.name]');
    expect(texts.weaponName('unknown')).toBe('unknown');
  });
});
