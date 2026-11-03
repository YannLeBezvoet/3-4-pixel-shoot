// Sandbox: everyone appears in their team's area and comes back 2 seconds after dying. No
// rounds, no winner. Used by developer pages and tests, not offered in menus; the smallest
// example of a mode (docs/guides/add-a-mode.md).
import type { GameModeDefinition, ParticipantId } from '@pixel-shoot/sim';
import { TICK_RATE } from '@pixel-shoot/sim';
import { z } from 'zod';

const RESPAWN_TICKS = 2 * TICK_RATE;

export const sandboxSettings = z.strictObject({
  friendlyFire: z.boolean().default(false).describe('Bullets hurt teammates.'),
});

export type SandboxSettings = z.infer<typeof sandboxSettings>;

export const sandbox: GameModeDefinition<SandboxSettings> = {
  id: 'sandbox',
  nameKey: 'mode.sandbox.name',
  settings: sandboxSettings,
  mapRequirements: { teams: 1 },
  rules: (settings) => ({ friendlyFire: settings.friendlyFire }),
  create(api) {
    /** Participant → tick at which it comes back. */
    const respawns = new Map<ParticipantId, number>();
    return {
      onMatchStart() {
        for (const participant of api.participants()) api.spawn(participant.id);
      },
      onParticipantJoined(id) {
        api.spawn(id);
      },
      onParticipantLeft(id) {
        respawns.delete(id);
      },
      onEvent(event) {
        if (event.type !== 'killed') return;
        const victim = api.participants().find((p) => api.characterOf(p.id)?.id === event.victim);
        if (victim) respawns.set(victim.id, api.tick + RESPAWN_TICKS);
      },
      onTick() {
        for (const [id, at] of respawns) {
          if (api.tick < at) continue;
          respawns.delete(id);
          api.spawn(id);
        }
      },
      state: () => ({}),
    };
  },
};
