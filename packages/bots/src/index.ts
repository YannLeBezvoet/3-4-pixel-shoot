// Public entry point. Only what is exported here may be imported by other packages.
export {
  HEARING_RADIUS,
  MEMORY_TICKS,
  Memory,
  VIEW_HALF_HEIGHT,
  VIEW_HALF_WIDTH,
  canSee,
  visibleEnemies,
} from './perception';
export type { Clue, Sighting } from './perception';
export { NavGrid, findPath, smoothPath } from './navigation';
export type { Point } from './navigation';
