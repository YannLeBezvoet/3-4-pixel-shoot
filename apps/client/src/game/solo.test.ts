import type { Theme } from '@pixel-shoot/content';
import { asciiMap, testCatalog } from '@pixel-shoot/sim';
import { describe, expect, it, vi } from 'vitest';
import { clampBots, createSoloMatch, soloMaps } from './solo';

// The theme's catalog is the test catalog: one character per faction is enough here.
vi.mock('@pixel-shoot/content', () => ({ buildCatalog: () => testCatalog() }));

const theme = {
  id: 't',
  factions: [
    { id: 'blue', nameKey: 'faction.blue' },
    { id: 'red', nameKey: 'faction.red' },
  ],
  characters: new Map([
    ['rifleman', { id: 'rifleman', faction: 'blue' }],
    ['other', { id: 'rifleman', faction: 'red' }],
  ]),
} as unknown as Theme;

const map = asciiMap(`
  ##############
  #11111..22222#
  #11111..22222#
  ##############
`);

describe('solo setup', () => {
  it('offers the maps that suit team elimination', () => {
    expect(
      soloMaps(
        new Map([
          ['maps/b', map],
          ['maps/a', asciiMap('#1..#')],
        ]),
      ),
    ).toEqual(['maps/b']);
  });

  it('keeps bot counts within the limits (Q24)', () => {
    expect(clampBots(9, 0)).toEqual({ allies: 7, enemies: 1 });
    expect(clampBots(7, 8)).toEqual({ allies: 7, enemies: 8 });
    expect(clampBots(-1, 3.4)).toEqual({ allies: 0, enemies: 3 });
  });

  it('builds the match: the player on the chosen side, named bots on both sides', () => {
    const { host, local } = createSoloMatch(
      theme,
      map,
      {
        themeId: 't',
        mapRef: 'maps/a',
        side: 2,
        allies: 2,
        enemies: 3,
        difficulty: 'hard',
        friendlyFire: false,
      },
      42,
    );
    const participants = host.view().participants;
    expect(participants).toHaveLength(6);
    expect(participants.find((p) => p.id === local)).toMatchObject({
      team: 2,
      kind: 'human',
      name: { key: 'participant.you' },
    });
    expect(participants.filter((p) => p.kind === 'bot' && p.team === 2)).toHaveLength(2);
    expect(participants.filter((p) => p.team === 1).map((p) => p.name)).toEqual([
      { key: 'participant.bot', params: { n: 3 } },
      { key: 'participant.bot', params: { n: 4 } },
      { key: 'participant.bot', params: { n: 5 } },
    ]);
    expect(host.view().mode.round).toBe(1);
  });
});
