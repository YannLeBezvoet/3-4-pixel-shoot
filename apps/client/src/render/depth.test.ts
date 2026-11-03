import { describe, expect, it } from 'vitest';
import { depthOf } from './depth';

describe('depthOf (C1.3)', () => {
  const treeBase = 500;

  it('draws a character above the base of a tree behind the tree', () => {
    expect(depthOf(treeBase - 1, 7)).toBeLessThan(depthOf(treeBase, 0));
    expect(depthOf(treeBase - 30, 900)).toBeLessThan(depthOf(treeBase, 0));
  });

  it('draws a character below the base of a tree in front of the tree', () => {
    expect(depthOf(treeBase + 1, 0)).toBeGreaterThan(depthOf(treeBase, 1000));
  });

  it('breaks ties on the same row by order, and rounds to whole pixels', () => {
    expect(depthOf(200, 3)).toBeGreaterThan(depthOf(200, 2));
    expect(depthOf(200.2, 2)).toBe(depthOf(200, 2));
    expect(depthOf(10, -1)).toBeLessThan(depthOf(11, 0));
  });
});
