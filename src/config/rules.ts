import type { Grid, TileRule, TileType, GlobalRules } from '../types';
import { getNeighbors, isEdgeCell } from '../engine/grid-helpers';
import { isAccessible } from '../engine/connectivity';

/** Variant colors shared between pizza and mailbox so each pair is visually matched.
 *  pepper = green, cheese = yellow, pepperoni = red. */
const VARIANT_COLORS: Record<string, string> = {
  pepper: '#22c55e',
  cheese: '#eab308',
  pepperoni: '#ef4444',
};

const VARIANT_ASSIGNMENTS: Record<'pizza' | 'mailbox', (players: number) => string[]> = {
  pizza: (p) => {
    if (p === 2) return ['pepper', 'cheese'];
    if (p === 3) return ['pepper', 'cheese', 'pepperoni'];
    return ['cheese', 'pepperoni', 'cheese', 'pepperoni']; // 4 players
  },
  mailbox: (p) => VARIANT_ASSIGNMENTS.pizza(p),
};

export function getVariantAssignment(
  type: 'pizza' | 'mailbox',
  players: number,
): string[] {
  return VARIANT_ASSIGNMENTS[type](players);
}

/** Returns true if the cell at (r,c) is empty. */
function isEmpty(grid: Grid, r: number, c: number): boolean {
  return grid[r][c] === null;
}

/** Start tile: not on edge, 8 surrounding cells empty. */
function startCanPlace(grid: Grid, r: number, c: number): boolean {
  if (!isEmpty(grid, r, c)) return false;
  if (isEdgeCell(grid, r, c)) return false;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, 8)) {
    if (!isEmpty(grid, nr, nc)) return false;
  }
  return true;
}

/** Pizza: general rules only (occupied check). */
function pizzaCanPlace(grid: Grid, r: number, c: number): boolean {
  return isEmpty(grid, r, c);
}

/** Mailbox: not adjacent (8-dir) to a pizza box of the same variant. */
function mailboxCanPlace(grid: Grid, r: number, c: number, variant?: string): boolean {
  if (!isEmpty(grid, r, c)) return false;
  if (!variant) return false;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, 8)) {
    const cell = grid[nr][nc];
    if (cell?.tile === 'pizza' && cell.variant === variant) return false;
  }
  return true;
}

/** Generic: just empty cell. */
function genericCanPlace(grid: Grid, r: number, c: number): boolean {
  return isEmpty(grid, r, c);
}

/** Chebyshev distance between two cells. */
export function chebyshev(r1: number, c1: number, r2: number, c2: number): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

/** True if the cell at (r,c) is adjacent to a pizza box, per the given metric. */
export function isAdjacentToPizza(
  grid: Grid,
  r: number,
  c: number,
  metric: 'chebyshev' | 'manhattan',
): boolean {
  const dirs = metric === 'chebyshev' ? 8 : 4;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, dirs)) {
    if (grid[nr][nc]?.tile === 'pizza') return true;
  }
  return false;
}

/** True if placing a teleporter at (r,c) is at least minDistance (Chebyshev)
 *  from every other teleporter on the grid. */
export function respectsMinDistance(
  grid: Grid,
  r: number,
  c: number,
  minDistance: number,
): boolean {
  const size = grid.length;
  for (let nr = 0; nr < size; nr++) {
    for (let nc = 0; nc < size; nc++) {
      if (nr === r && nc === c) continue;
      if (grid[nr][nc]?.tile === 'teleporter') {
        if (chebyshev(r, c, nr, nc) < minDistance) return false;
      }
    }
  }
  return true;
}

export const TILE_RULES: Record<TileType, TileRule> = {
  start: {
    type: 'start',
    label: 'Start',
    icon: '🚩',
    color: '#22c55e',
    count: (p) => p,
    canPlace: startCanPlace,
  },
  pizza: {
    type: 'pizza',
    label: 'Pizza Box',
    icon: '🍕',
    color: '#f97316',
    variantColors: VARIANT_COLORS,
    variants: ['pepper', 'cheese', 'pepperoni'],
    count: (p) => p,
    variantAssignment: (p) => getVariantAssignment('pizza', p),
    canPlace: pizzaCanPlace,
  },
  mailbox: {
    type: 'mailbox',
    label: 'Mailbox',
    icon: '📬',
    color: '#3b82f6',
    variantColors: VARIANT_COLORS,
    variants: ['pepper', 'cheese', 'pepperoni'],
    count: (p) => p,
    variantAssignment: (p) => getVariantAssignment('mailbox', p),
    canPlace: mailboxCanPlace,
  },
  grave: {
    type: 'grave',
    label: 'Grave',
    icon: '⚰️',
    color: '#6b7280',
    count: () => 6,
    canPlace: genericCanPlace,
  },
  fence: {
    type: 'fence',
    label: 'Fence',
    icon: '🚧',
    color: '#a16207',
    count: () => 4,
    canPlace: genericCanPlace,
  },
  teleporter: {
    type: 'teleporter',
    label: 'Teleporter',
    icon: '🌀',
    color: '#a855f7',
    variants: ['square', 'triangle', 'circle'],
    count: () => 3,
    variantAssignment: () => ['square', 'triangle', 'circle'],
    canPlace: genericCanPlace,
  },
};

export const GLOBAL_RULES: GlobalRules = {
  minSize: 5,
  maxSize: 10,
  startExclusionRadius: 1,
  movementDirections: '4',
  checkAccessibility: isAccessible,
  oneTilePerCell: true,
  portalSettings: {
    noPizzaAdjacent: true,
    pizzaAdjacencyMetric: 'chebyshev',
    minDistance: null,
  },
};