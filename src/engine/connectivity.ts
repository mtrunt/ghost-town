import type { Grid } from '../types';
import { getNeighbors } from './grid-helpers';

/**
 * Returns true if all non-fence cells are mutually reachable via
 * orthogonal movement that cannot pass through fence cells.
 * An empty grid (no non-fence cells) is considered accessible.
 */
export function isAccessible(grid: Grid): boolean {
  const size = grid.length;
  const open: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]?.tile !== 'fence') open.push([r, c]);
    }
  }
  if (open.length === 0) return true;

  const visited = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const stack: Array<[number, number]> = [open[0]];
  visited[open[0][0]][open[0][1]] = true;
  let count = 1;

  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const { r: nr, c: nc } of getNeighbors(grid, r, c, 4)) {
      if (visited[nr][nc]) continue;
      if (grid[nr][nc]?.tile === 'fence') continue;
      visited[nr][nc] = true;
      count++;
      stack.push([nr, nc]);
    }
  }
  return count === open.length;
}