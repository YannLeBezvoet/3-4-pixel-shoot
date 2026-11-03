// 3. Movement and collision: actors accelerate toward the speed their input asks for (Q19),
// slide along obstacles, then push each other apart so they never overlap (Q48).
import { TICK_SECONDS } from '../core/time';
import { BLOCKS_MOVEMENT } from '../map/map-data';
import { moveCircle } from '../physics/move-circle';
import type { WorldState } from '../world/state';
import { indexActors } from '../world/state';

/** Time to reach full speed from standing still, in seconds (Q19). */
export const ACCELERATION_TIME = 0.08;

export function movement(world: WorldState): void {
  for (const [id, actor] of world.actor.entries()) {
    const velocity = world.velocity.get(id);
    const position = world.position.get(id);
    const body = world.body.get(id);
    if (!velocity || !position || !body) continue;

    // Accelerate toward the target velocity by a bounded change per tick.
    const targetX = actor.input.move.x * actor.speed;
    const targetY = actor.input.move.y * actor.speed;
    const maxChange = (actor.speed * TICK_SECONDS) / ACCELERATION_TIME;
    const changeX = targetX - velocity.x;
    const changeY = targetY - velocity.y;
    const change = Math.hypot(changeX, changeY);
    const ratio = change > maxChange ? maxChange / change : 1;
    velocity.x += changeX * ratio;
    velocity.y += changeY * ratio;

    const next = moveCircle(
      world.grid,
      position.x,
      position.y,
      body.radius,
      velocity.x * TICK_SECONDS,
      velocity.y * TICK_SECONDS,
      BLOCKS_MOVEMENT,
    );
    position.x = next.x;
    position.y = next.y;
  }
  separateActors(world);
  indexActors(world);
}

/** Pushes overlapping actors apart, half each, sliding along obstacles. */
function separateActors(world: WorldState): void {
  indexActors(world);
  for (const id of world.actor.ids()) {
    const a = world.position.get(id);
    const body = world.body.get(id);
    if (!a || !body) continue;
    const reach = body.radius + world.maxActorRadius;
    for (const otherId of world.actorIndex.query(
      a.x - reach,
      a.y - reach,
      a.x + reach,
      a.y + reach,
    )) {
      if (otherId <= id) continue;
      const b = world.position.get(otherId);
      const otherBody = world.body.get(otherId);
      if (!b || !otherBody) continue;
      const minDistance = body.radius + otherBody.radius;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= minDistance) continue;
      if (distance === 0) {
        // Exactly on top of each other: separate along x, the lower id to the left.
        dx = 1;
        dy = 0;
      } else {
        dx /= distance;
        dy /= distance;
      }
      const half = (minDistance - distance) / 2;
      const nextA = moveCircle(
        world.grid,
        a.x,
        a.y,
        body.radius,
        -dx * half,
        -dy * half,
        BLOCKS_MOVEMENT,
      );
      const nextB = moveCircle(
        world.grid,
        b.x,
        b.y,
        otherBody.radius,
        dx * half,
        dy * half,
        BLOCKS_MOVEMENT,
      );
      a.x = nextA.x;
      a.y = nextA.y;
      b.x = nextB.x;
      b.y = nextB.y;
    }
  }
}
