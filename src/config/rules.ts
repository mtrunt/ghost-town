import type { Grid, TileRule, TileType, GlobalRules, PortalSettings } from '../types';
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

/** Start tile: not on edge, 4 orthogonally adjacent cells empty. */
function startCanPlace(grid: Grid, r: number, c: number): boolean {
  if (!isEmpty(grid, r, c)) return false;
  if (isEdgeCell(grid, r, c)) return false;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, 4)) {
    if (!isEmpty(grid, nr, nc)) return false;
  }
  return true;
}

/** Pizza: general rules only (occupied check). */
function pizzaCanPlace(grid: Grid, r: number, c: number): boolean {
  return isEmpty(grid, r, c);
}

/** Mailbox: not adjacent (8-dir) to a pizza box of the same variant, nor to another mailbox of the same variant.
 *  When settings.mailboxMinDistance is on and minDistance is set, the mailbox
 *  must also be at least `minDistance` (Chebyshev) from any same-variant pizza. */
function mailboxCanPlace(
  grid: Grid,
  r: number,
  c: number,
  variant?: string,
  settings?: PortalSettings,
): boolean {
  if (!isEmpty(grid, r, c)) return false;
  if (!variant) return false;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, 8)) {
    const cell = grid[nr][nc];
    if (cell?.tile === 'pizza' && cell.variant === variant) return false;
    if (cell?.tile === 'mailbox' && cell.variant === variant) return false;
  }
  if (settings?.mailboxMinDistance && settings.minDistance != null && settings.minDistance > 0) {
    if (!respectsMailboxPizzaDistance(grid, r, c, variant, settings.minDistance)) return false;
  }
  return true;
}

/** Generic: just empty cell. */
function genericCanPlace(grid: Grid, r: number, c: number): boolean {
  return isEmpty(grid, r, c);
}

/** Teleporter: empty cell + optional portal settings (pizza adjacency, min distance). */
function teleporterCanPlace(
  grid: Grid,
  r: number,
  c: number,
  _variant?: string,
  settings?: PortalSettings,
): boolean {
  if (!isEmpty(grid, r, c)) return false;
  if (settings?.noPizzaAdjacent) {
    if (isAdjacentToPizza(grid, r, c, settings.pizzaAdjacencyMetric)) return false;
  }
  if (settings?.noMailboxAdjacent) {
    if (isAdjacentToTile(grid, r, c, 'mailbox', settings.pizzaAdjacencyMetric)) return false;
  }
  if (settings?.minDistance != null && settings.minDistance > 0) {
    if (!respectsMinDistance(grid, r, c, settings.minDistance)) return false;
  }
  return true;
}

/** Chebyshev distance between two cells. */
export function chebyshev(r1: number, c1: number, r2: number, c2: number): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

/** True if the cell at (r,c) is adjacent to a tile of the given type, per the given metric. */
export function isAdjacentToTile(
  grid: Grid,
  r: number,
  c: number,
  tile: TileType,
  metric: 'chebyshev' | 'manhattan',
): boolean {
  const dirs = metric === 'chebyshev' ? 8 : 4;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, dirs)) {
    if (grid[nr][nc]?.tile === tile) return true;
  }
  return false;
}

/** True if the cell at (r,c) is adjacent to a pizza box, per the given metric. */
export function isAdjacentToPizza(
  grid: Grid,
  r: number,
  c: number,
  metric: 'chebyshev' | 'manhattan',
): boolean {
  return isAdjacentToTile(grid, r, c, 'pizza', metric);
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

/** True if the cell at (r,c) is at least minDistance (Chebyshev) from every
 *  pizza box of the given `variant` on the grid. Used by mailbox placement
 *  to enforce a same-variant separation distance. */
export function respectsMailboxPizzaDistance(
  grid: Grid,
  r: number,
  c: number,
  variant: string,
  minDistance: number,
): boolean {
  const size = grid.length;
  for (let nr = 0; nr < size; nr++) {
    for (let nc = 0; nc < size; nc++) {
      if (nr === r && nc === c) continue;
      const cell = grid[nr][nc];
      if (cell?.tile === 'pizza' && cell.variant === variant) {
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
    canPlace: teleporterCanPlace,
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
    noMailboxAdjacent: true,
    minDistance: 3,
    mailboxMinDistance: true,
  },
};