import { describe, expect, it } from 'vitest';
import { createEmptyGrid } from './grid-helpers';
import { isAccessible } from './connectivity';

describe('connectivity', () => {
  it('empty grid is accessible', () => {
    expect(isAccessible(createEmptyGrid(5))).toBe(true);
  });

  it('grid with one fence is accessible', () => {
    const g = createEmptyGrid(5);
    g[2][2] = { tile: 'fence' };
    expect(isAccessible(g)).toBe(true);
  });

  it('fence wall splitting grid is NOT accessible', () => {
    const g = createEmptyGrid(5);
    for (let r = 0; r < 5; r++) g[r][2] = { tile: 'fence' };
    expect(isAccessible(g)).toBe(false);
  });

  it('fence wall with gap is accessible', () => {
    const g = createEmptyGrid(5);
    for (let r = 0; r < 5; r++) {
      if (r !== 2) g[r][2] = { tile: 'fence' };
    }
    expect(isAccessible(g)).toBe(true);
  });

  it('all-fence grid (no open cells) is vacuously accessible', () => {
    const g = createEmptyGrid(3);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g[r][c] = { tile: 'fence' };
    expect(isAccessible(g)).toBe(true);
  });
});