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
  | { readonly type: 'actorRemoved'; readonly entity: EntityId }
  | {
      /** A weapon fired. (x, y) is the muzzle's ground point, z its height. */
      readonly type: 'shotFired';
      readonly shooter: EntityId;
      readonly weapon: string;
      readonly x: number;
      readonly y: number;
      readonly z: number;
      /** Direction of the shot, spread included. */
      readonly angle: number;
      /** The projectile in flight; undefined when it hit something before leaving the muzzle. */
      readonly projectile: EntityId | undefined;
    }
  | {
      readonly type: 'reloadStarted';
      readonly entity: EntityId;
      readonly weapon: string;
      /** Duration in ticks. */
      readonly ticks: number;
    }
  | { readonly type: 'reloaded'; readonly entity: EntityId; readonly weapon: string }
  | {
      /** A projectile stopped against an obstacle. */
      readonly type: 'projectileImpact';
      readonly projectile: EntityId | undefined;
      readonly kind: string;
      readonly x: number;
      readonly y: number;
      readonly z: number;
      readonly angle: number;
    }
  | {
      /** A projectile struck a character. */
      readonly type: 'hit';
      readonly projectile: EntityId | undefined;
      readonly kind: string;
      readonly attacker: EntityId;
      readonly target: EntityId;
      readonly weapon: string;
      readonly damage: number;
      readonly x: number;
      readonly y: number;
      readonly z: number;
      readonly angle: number;
    };

export type SimEventType = SimEvent['type'];
