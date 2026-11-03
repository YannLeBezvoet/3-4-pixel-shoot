// What happened during a tick. Presentation, game modes, bots and the network consume
// events; none of them poll simulation internals (ARCHITECTURE §5).
import type { EntityId } from './entities';

export type SimEvent =
  | {
      readonly type: 'actorSpawned';
      readonly entity: EntityId;
      readonly team: number;
      readonly character: string;
    }
  | { readonly type: 'actorRemoved'; readonly entity: EntityId };

export type SimEventType = SimEvent['type'];
