import { describe, expect, it } from 'vitest';
import { pickLanguage } from './pick-language';

describe('pickLanguage', () => {
  const available = ['en', 'fr', 'pt-BR'];

  it('prefers the saved choice when it still exists', () => {
    expect(pickLanguage(available, 'fr', ['en-US'])).toBe('fr');
    expect(pickLanguage(available, 'de', ['en-US'])).toBe('en');
  });

  it('follows the browser languages in order, exact then base language', () => {
    expect(pickLanguage(available, null, ['fr-CA', 'en'])).toBe('fr');
    expect(pickLanguage(available, null, ['pt-br'])).toBe('pt-BR');
    expect(pickLanguage(available, null, ['de-DE', 'fr'])).toBe('fr');
  });

  it('falls back to English, or to any language when English is missing', () => {
    expect(pickLanguage(available, null, ['ja'])).toBe('en');
    expect(pickLanguage(['fr'], null, [])).toBe('fr');
  });
});
