import type { Grid } from '../types';

export function createEmptyGrid(size: number): Grid {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((c) => (c ? { ...c } : null)));
}

export function inBounds(grid: Grid, r: number, c: number): boolean {
  return r >= 0 && r < grid.length && c >= 0 && c < grid[0].length;
}

export function getNeighbors(
  grid: Grid,
  r: number,
  c: number,
  directions: 4 | 8 = 4,
): Array<{ r: number; c: number }> {
  const dirs4 = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const dirs8 = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1],
  ];
  const dirs = directions === 8 ? dirs8 : dirs4;
  return dirs
    .map(([dr, dc]) => ({ r: r + dr, c: c + dc }))
    .filter(({ r, c }) => inBounds(grid, r, c));
}

export function isEdgeCell(grid: Grid, r: number, c: number): boolean {
  const size = grid.length;
  return r === 0 || r === size - 1 || c === 0 || c === size - 1;
}