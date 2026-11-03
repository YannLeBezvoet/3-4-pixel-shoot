// Spectating after death (Q21): the camera follows a living teammate; clicks switch between
// them (Q53). Pure: no DOM, no PixiJS.
import type { WorldView } from '@pixel-shoot/match';
import type { EntityId, ParticipantId } from '@pixel-shoot/sim';

/** Living teammates the camera may follow, in a stable order. */
export function spectatable(view: WorldView, team: number): EntityId[] {
  return view.actors
    .filter((a) => a.alive && a.team === team)
    .map((a) => a.id)
    .sort((a, b) => a - b);
}

/**
 * The character the camera follows: the player's own while alive; otherwise `current` if it
 * is still a living teammate, else the first living teammate, else the player's corpse.
 */
export function followed(
  view: WorldView,
  local: ParticipantId,
  current: EntityId | undefined,
): EntityId | undefined {
  const me = view.participants.find((p) => p.id === local);
  const mine = view.actors.find((a) => a.id === me?.entity);
  if (!me || mine?.alive) return mine?.id;
  const mates = spectatable(view, me.team);
  if (mates.length === 0) return mine?.id;
  return current !== undefined && mates.includes(current) ? current : mates[0];
}

/** The next (1) or previous (-1) living teammate after `current`, wrapping around. */
export function cycle(
  view: WorldView,
  team: number,
  current: EntityId | undefined,
  direction: 1 | -1,
): EntityId | undefined {
  const mates = spectatable(view, team);
  if (mates.length === 0) return current;
  const index = mates.indexOf(current ?? -1);
  return mates[(index + direction + mates.length) % mates.length];
}
