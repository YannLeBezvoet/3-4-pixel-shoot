import { describe, expect, it } from 'vitest';
import { scopeOf } from './hot-reload';

describe('scopeOf', () => {
  it('reloads only the maps when a map or a tileset changes', () => {
    expect(scopeOf('themes/vietnam/maps/river-village.tmj')).toBe('themes/vietnam/maps/');
    expect(scopeOf('themes/vietnam/tilesets/jungle-ground.png')).toBe('themes/vietnam/maps/');
  });

  it('reloads the theme for its other files, the languages otherwise', () => {
    expect(scopeOf('themes/vietnam/weapons.json')).toBe('themes/vietnam/');
    expect(scopeOf('themes/vietnam/sprites/weapons/m16a1.png')).toBe('themes/vietnam/');
    expect(scopeOf('locales/fr.json')).toBe('locales/');
  });
});
