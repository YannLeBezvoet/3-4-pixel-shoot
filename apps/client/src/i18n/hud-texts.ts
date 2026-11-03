// Texts of the HUD in the player's language: interface keys, match texts (DisplayText) whose
// `team` parameter becomes the faction name, faction and weapon names from the theme.
import type { Theme } from '@pixel-shoot/content';
import type { DisplayText } from '@pixel-shoot/sim';
import type { HudTexts } from '../render/hud';
import type { Translator } from './translator';

export function hudTexts(
  translator: Pick<Translator, 't' | 'themeText'>,
  theme: Pick<Theme, 'id' | 'defaultLanguage' | 'factions' | 'weapons'>,
): HudTexts {
  const teamName = (team: number) => {
    const faction = theme.factions[team - 1];
    return faction ? translator.themeText(theme, faction.nameKey) : String(team);
  };
  return {
    t: (key, params) => translator.t(key, params),
    display: (text: DisplayText) => {
      if ('text' in text) return text.text;
      const params = text.params
        ? Object.fromEntries(
            Object.entries(text.params).map(([name, value]) => [
              name,
              name === 'team' && typeof value === 'number' ? teamName(value) : value,
            ]),
          )
        : undefined;
      return translator.t(text.key, params);
    },
    teamName,
    weaponName: (id) => {
      const weapon = theme.weapons.get(id);
      return weapon ? translator.themeText(theme, weapon.nameKey) : id;
    },
  };
}
