// What happened during a tick. Presentation, game modes, bots and the network consume
// events; none of them poll simulation internals (ARCHITECTURE §5).
import type { Box } from '../map/map-data';
import type { EntityId } from './entities';

/** What caused damage; a map element's damage filter selects among them (Q33). */
export type DamageSource = 'bullet' | 'explosion' | 'fire';

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
      /** A thrown weapon left the hands. (x, y) is the thrower's ground point. */
      readonly type: 'thrown';
      readonly thrower: EntityId;
      readonly weapon: string;
      readonly x: number;
      readonly y: number;
      readonly projectile: EntityId;
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
    }
  | {
      /** Something blew up. Characters and map elements in the blast get their damage. */
      readonly type: 'exploded';
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly owner: EntityId;
      readonly weapon: string;
      /** Projectile id in the catalog, when a projectile exploded. */
      readonly kind: string | undefined;
    }
  | {
      /** A tile of the map became another one. `tile` indexes `MapData.tileTypes`. */
      readonly type: 'tileChanged';
      /** Index in `MapData.layers`. */
      readonly layer: number;
      readonly tileX: number;
      readonly tileY: number;
      readonly tile: number;
    }
  | {
      /** A map element was destroyed; a tile also reports its `tileChanged`. */
      readonly type: 'elementDestroyed';
      /** Id of the map object, when it was one. */
      readonly object: number | undefined;
      /** What it covered. */
      readonly box: Box;
      readonly attacker: EntityId;
    }
  | {
      /** Every map element is back as the map describes it: a new round. */
      readonly type: 'mapReset';
    }
  | {
      /** A character lost hit points. */
      readonly type: 'damaged';
      readonly target: EntityId;
      readonly attacker: EntityId;
      readonly weapon: string;
      readonly source: DamageSource;
      readonly amount: number;
      /** Hit points left. */
      readonly hp: number;
    }
  | {
      /** A character died; its corpse stays where it fell (Q28). */
      readonly type: 'killed';
      readonly victim: EntityId;
      readonly killer: EntityId;
      readonly weapon: string;
      readonly source: DamageSource;
      readonly x: number;
      readonly y: number;
    };

export type SimEventType = SimEvent['type'];
