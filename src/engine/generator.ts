import type { Grid, Cell, TileType, PortalSettings } from '../types';
import { createEmptyGrid, cloneGrid, getNeighbors } from './grid-helpers';
import { isAccessible } from './connectivity';
import { TILE_RULES, getVariantAssignment, GLOBAL_RULES } from '../config/rules';

interface PlacementUnit {
  type: TileType;
  variant?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPlacementOrder(players: number): PlacementUnit[] {
  const units: PlacementUnit[] = [];

  // Start tiles first (most constrained).
  for (let i = 0; i < TILE_RULES.start.count(players); i++) units.push({ type: 'start' });

  // Pizza boxes (with pre-assigned variants).
  const pizzaVariants = getVariantAssignment('pizza', players);
  for (const v of pizzaVariants) units.push({ type: 'pizza', variant: v });

  // Mailboxes (matching pizza variants).
  const mailboxVariants = getVariantAssignment('mailbox', players);
  for (const v of mailboxVariants) units.push({ type: 'mailbox', variant: v });

  // Teleporters (one of each shape).
  const tpVariants = TILE_RULES.teleporter.variants ?? ['square', 'triangle', 'circle'];
  for (const v of tpVariants) units.push({ type: 'teleporter', variant: v });

  // Graves.
  for (let i = 0; i < TILE_RULES.grave.count(players); i++) units.push({ type: 'grave' });

  // Fences last (accessibility depends on everything else).
  for (let i = 0; i < TILE_RULES.fence.count(players); i++) units.push({ type: 'fence' });

  return units;
}

// Upper bound on placement attempts per generator invocation. Without this,
// the backtracker can spend exponential time proving an over-constrained
// configuration (e.g. 7x7 with 4 players) is infeasible before returning null,
// which hangs the UI. When the limit is hit we return null and the caller
// treats it as "no valid setup found for these settings".
const MAX_ATTEMPTS = 100_000;

function backtrack(
  grid: Grid,
  units: PlacementUnit[],
  idx: number,
  fencePlaced: number,
  totalFences: number,
  budget: { left: number },
  settings: PortalSettings,
): Grid | null {
  if (idx === units.length) return grid;
  if (budget.left <= 0) return null;

  const unit = units[idx];
  const size = grid.length;
  const cells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push({ r, c });

  for (const { r, c } of shuffle(cells)) {
    budget.left--;
    if (budget.left < 0) return null;

    const rule = TILE_RULES[unit.type];
    if (!rule.canPlace(grid, r, c, unit.variant, settings)) continue;

    const next = cloneGrid(grid);
    next[r][c] = { tile: unit.type, variant: unit.variant } as Cell;

    // All predicates look at radius ≤ 1, so a new placement can only break
    // rules for tiles already placed in the 8 surrounding cells. Re-run
    // their canPlace to keep the partial grid valid for those neighbors.
    let neighborOk = true;
    for (const { r: nr, c: nc } of getNeighbors(next, r, c, 8)) {
      const cell = next[nr][nc];
      if (!cell) continue;
      const nRule = TILE_RULES[cell.tile];
      const testGrid = next.map((row, ri) =>
        row.map((x, ci) => (ri === nr && ci === nc ? null : x)),
      );
      if (!nRule.canPlace(testGrid, nr, nc, cell.variant, settings)) {
        neighborOk = false;
        break;
      }
    }
    if (!neighborOk) continue;

    // If this is the final fence, verify accessibility.
    const isLastFence = unit.type === 'fence' && fencePlaced + 1 === totalFences;
    if (isLastFence && !isAccessible(next)) continue;

    const result = backtrack(
      next,
      units,
      idx + 1,
      unit.type === 'fence' ? fencePlaced + 1 : fencePlaced,
      totalFences,
      budget,
      settings,
    );
    if (result) return result;
  }

  return null;
}

export function generate(
  size: number,
  players: number,
  settings: PortalSettings = GLOBAL_RULES.portalSettings,
): Grid | null {
  const units = buildPlacementOrder(players);
  const totalFences = TILE_RULES.fence.count(players);
  // Random-restart loop: each attempt gets a fresh budget. A single attempt
  // may exhaust its budget on a bad random starting arrangement even when a
  // valid board exists, so we retry a few times before declaring failure.
  // Per-restart success on hard boards (7x7/4p) is ~20%, so a high restart
  // count is needed for the overall call to succeed reliably; each failed
  // restart costs well under 100ms, keeping worst-case latency around 1s.
  const RESTARTS = 40;
  for (let i = 0; i < RESTARTS; i++) {
    const budget = { left: MAX_ATTEMPTS };
    const result = backtrack(createEmptyGrid(size), units, 0, 0, totalFences, budget, settings);
    if (result) return result;
  }
  return null;
}