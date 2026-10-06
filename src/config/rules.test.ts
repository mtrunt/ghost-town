import { describe, expect, it } from 'vitest';
import { createEmptyGrid } from '../engine/grid-helpers';
import { isAccessible } from '../engine/connectivity';
import { TILE_RULES, GLOBAL_RULES, getVariantAssignment, chebyshev, isAdjacentToPizza, respectsMinDistance } from './rules';

describe('tile rule config', () => {
  it('start tile cannot be on edge', () => {
    const g = createEmptyGrid(7);
    expect(TILE_RULES.start.canPlace(g, 0, 0)).toBe(false);
    expect(TILE_RULES.start.canPlace(g, 6, 3)).toBe(false);
    expect(TILE_RULES.start.canPlace(g, 3, 3)).toBe(true);
  });

  it('start tile requires 8 surrounding cells empty', () => {
    const g = createEmptyGrid(7);
    g[2][3] = { tile: 'grave' };
    expect(TILE_RULES.start.canPlace(g, 3, 3)).toBe(false);
  });

  it('start count equals player count', () => {
    expect(TILE_RULES.start.count(2)).toBe(2);
    expect(TILE_RULES.start.count(4)).toBe(4);
  });

  it('pizza variantAssignment: 2 players distinct', () => {
    expect(getVariantAssignment('pizza', 2)).toEqual(['pepper', 'cheese']);
  });

  it('pizza variantAssignment: 3 players distinct', () => {
    expect(getVariantAssignment('pizza', 3)).toEqual(['pepper', 'cheese', 'pepperoni']);
  });

  it('pizza variantAssignment: 4 players only cheese + pepperoni', () => {
    const v = getVariantAssignment('pizza', 4);
    expect(v).toHaveLength(4);
    expect(v.every((x) => x === 'cheese' || x === 'pepperoni')).toBe(true);
  });

  it('mailbox variantAssignment matches pizza', () => {
    expect(getVariantAssignment('mailbox', 3)).toEqual(getVariantAssignment('pizza', 3));
  });

  it('mailbox cannot be adjacent to same pizza variant', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    expect(TILE_RULES.mailbox.canPlace(g, 2, 2, 'pepper')).toBe(false);
    expect(TILE_RULES.mailbox.canPlace(g, 0, 0, 'pepper')).toBe(true);
  });

  it('mailbox can be adjacent to different pizza variant', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    expect(TILE_RULES.mailbox.canPlace(g, 2, 2, 'cheese')).toBe(true);
  });

  it('grave, fence, teleporter can place on empty non-edge-irrelevant cell', () => {
    const g = createEmptyGrid(7);
    expect(TILE_RULES.grave.canPlace(g, 3, 3)).toBe(true);
    expect(TILE_RULES.fence.canPlace(g, 3, 3)).toBe(true);
    expect(TILE_RULES.teleporter.canPlace(g, 3, 3, 'square')).toBe(true);
  });

  it('all tiles cannot place on occupied cell', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'grave' };
    expect(TILE_RULES.start.canPlace(g, 3, 3)).toBe(false);
    expect(TILE_RULES.grave.canPlace(g, 3, 3)).toBe(false);
    expect(TILE_RULES.pizza.canPlace(g, 3, 3, 'pepper')).toBe(false);
  });

  it('global rules report size bounds', () => {
    expect(GLOBAL_RULES.minSize).toBe(5);
    expect(GLOBAL_RULES.maxSize).toBe(10);
  });

  it('teleporter variants are square, triangle, circle', () => {
    expect(TILE_RULES.teleporter.variants).toEqual(['square', 'triangle', 'circle']);
  });

  it('pizza variants are pepper, cheese, pepperoni', () => {
    expect(TILE_RULES.pizza.variants).toEqual(['pepper', 'cheese', 'pepperoni']);
  });

  it('grave count is 6, fence 4, teleporter 3', () => {
    expect(TILE_RULES.grave.count(2)).toBe(6);
    expect(TILE_RULES.fence.count(2)).toBe(4);
    expect(TILE_RULES.teleporter.count(2)).toBe(3);
  });

  it('GLOBAL_RULES.checkAccessibility matches isAccessible', () => {
    const g = createEmptyGrid(5);
    for (let r = 0; r < 5; r++) g[r][2] = { tile: 'fence' };
    expect(GLOBAL_RULES.checkAccessibility(g)).toBe(isAccessible(g));
    expect(GLOBAL_RULES.checkAccessibility(g)).toBe(false);
  });
});

describe('portal helpers', () => {
  it('chebyshev distance', () => {
    expect(chebyshev(0, 0, 0, 0)).toBe(0);
    expect(chebyshev(0, 0, 1, 1)).toBe(1);
    expect(chebyshev(0, 0, 2, 1)).toBe(2);
    expect(chebyshev(1, 1, 4, 3)).toBe(3);
  });

  it('isAdjacentToPizza chebyshev detects 8-dir neighbors', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    expect(isAdjacentToPizza(g, 2, 2, 'chebyshev')).toBe(true); // diagonal
    expect(isAdjacentToPizza(g, 2, 3, 'chebyshev')).toBe(true); // up
    expect(isAdjacentToPizza(g, 4, 4, 'chebyshev')).toBe(true); // diagonal
    expect(isAdjacentToPizza(g, 0, 0, 'chebyshev')).toBe(false);
  });

  it('isAdjacentToPizza manhattan only detects 4-dir neighbors', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    expect(isAdjacentToPizza(g, 2, 3, 'manhattan')).toBe(true); // up
    expect(isAdjacentToPizza(g, 3, 4, 'manhattan')).toBe(true); // right
    expect(isAdjacentToPizza(g, 2, 2, 'manhattan')).toBe(false); // diagonal
    expect(isAdjacentToPizza(g, 4, 4, 'manhattan')).toBe(false); // diagonal
  });

  it('respectsMinDistance true when far enough', () => {
    const g = createEmptyGrid(7);
    g[0][0] = { tile: 'teleporter', variant: 'square' };
    expect(respectsMinDistance(g, 3, 3, 2)).toBe(true); // chebyshev 3
  });

  it('respectsMinDistance false when too close', () => {
    const g = createEmptyGrid(7);
    g[0][0] = { tile: 'teleporter', variant: 'square' };
    expect(respectsMinDistance(g, 1, 1, 2)).toBe(false); // chebyshev 1
  });

  it('respectsMinDistance boundary: distance equals min is allowed', () => {
    const g = createEmptyGrid(7);
    g[0][0] = { tile: 'teleporter', variant: 'square' };
    expect(respectsMinDistance(g, 2, 0, 2)).toBe(true); // chebyshev 2, not < 2
  });

  it('respectsMinDistance ignores the candidate cell itself', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'teleporter', variant: 'square' };
    // Calling with (3,3) should not compare against itself.
    expect(respectsMinDistance(g, 3, 3, 1)).toBe(true);
  });
});