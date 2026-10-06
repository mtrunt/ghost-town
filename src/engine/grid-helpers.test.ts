import { describe, expect, it } from 'vitest';
import { createEmptyGrid, cloneGrid, inBounds, getNeighbors, isEdgeCell } from './grid-helpers';

describe('grid-helpers', () => {
  it('createEmptyGrid makes N×N null grid', () => {
    const g = createEmptyGrid(3);
    expect(g).toHaveLength(3);
    expect(g[0]).toHaveLength(3);
    expect(g.flat().every((c) => c === null)).toBe(true);
  });

  it('cloneGrid deep-clones', () => {
    const g = createEmptyGrid(2);
    g[0][0] = { tile: 'grave' };
    const c = cloneGrid(g);
    c[0][0] = null;
    expect(g[0][0]).toEqual({ tile: 'grave' });
  });

  it('inBounds respects size', () => {
    expect(inBounds(createEmptyGrid(4), 0, 0)).toBe(true);
    expect(inBounds(createEmptyGrid(4), 4, 0)).toBe(false);
    expect(inBounds(createEmptyGrid(4), -1, 0)).toBe(false);
  });

  it('getNeighbors returns 4-dir by default', () => {
    const g = createEmptyGrid(5);
    const n = getNeighbors(g, 2, 2);
    expect(n).toHaveLength(4);
  });

  it('getNeighbors returns 8-dir when requested', () => {
    const g = createEmptyGrid(5);
    const n = getNeighbors(g, 2, 2, 8);
    expect(n).toHaveLength(8);
  });

  it('isEdgeCell true on borders', () => {
    const g = createEmptyGrid(5);
    expect(isEdgeCell(g, 0, 0)).toBe(true);
    expect(isEdgeCell(g, 4, 2)).toBe(true);
    expect(isEdgeCell(g, 2, 2)).toBe(false);
  });
});