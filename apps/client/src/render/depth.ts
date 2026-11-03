// Depth sorting of the world layer (VISION §4, ARCHITECTURE §11): whatever stands lower on the
// screen (larger ground y) is drawn in front. A character standing above a tree's base is
// hidden by the tree; below it, the character covers the tree. Pure: no PixiJS.

/** Ties (same ground y) are broken by `order`, e.g. an entity id; at most this many. */
const ORDERS = 1024;

/** Draw order of something standing on the ground at `groundY`: larger is drawn later. */
export function depthOf(groundY: number, order = 0): number {
  return Math.round(groundY) * ORDERS + (((order % ORDERS) + ORDERS) % ORDERS);
}
