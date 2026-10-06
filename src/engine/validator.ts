import type { Grid, Violation } from '../types';
import { TILE_RULES, GLOBAL_RULES } from '../config/rules';

/**
 * Validates an entire grid against all tile rules and global rules.
 * Returns a list of violations with coordinates and messages.
 */
export function validate(grid: Grid): Violation[] {
  const violations: Violation[] = [];
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell) continue;

      // Re-run the tile's canPlace treating this cell as empty.
      const testGrid = grid.map((row, ri) =>
        row.map((x, ci) => (ri === r && ci === c ? null : x)),
      );
      const rule = TILE_RULES[cell.tile];
      if (!rule.canPlace(testGrid, r, c, cell.variant)) {
        violations.push({
          row: r,
          col: c,
          message: `${rule.label} at (${r},${c}) violates placement rules`,
        });
      }
    }
  }

  // Global: accessibility (fences block).
  if (!GLOBAL_RULES.checkAccessibility(grid)) {
    violations.push({
      row: -1,
      col: -1,
      message: 'Grid is not fully accessible: fences block access to some cells',
    });
  }

  return violations;
}

/** Helper: map violations to a Set of "r,c" keys for fast cell lookup. */
export function violationKeys(violations: Violation[]): Set<string> {
  return new Set(violations.map((v) => `${v.row},${v.col}`));
}