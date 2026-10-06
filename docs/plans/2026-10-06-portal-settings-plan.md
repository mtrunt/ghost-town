# Portal Optional Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two optional, user-configurable rules governing teleporter placement: (1) teleporters not adjacent to pizza (with selectable Chebyshev/Manhattan metric), and (2) minimum Chebyshev distance between teleporter pairs (threshold 1–7).

**Architecture:** Extend the existing config-driven rule system. A new `PortalSettings` object is threaded through the `TileRule.canPlace` signature (new optional `settings` param). Only the teleporter rule consumes it. The validator and generator both pass `settings` into their `canPlace` calls, keeping the two code paths in sync automatically. `useGrid` accepts `portalSettings` and passes it to `validate`/`generate`. `Controls` gains toggles; `App` owns the settings state.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, @testing-library/react, oxlint.

**Design doc:** `docs/plans/2026-10-06-portal-settings-design.md`

---

## Task 1: Add PortalSettings type and update TileRule signature

**Files:**
- Modify: `src/types.ts`

**Step 1: Write the type changes**

Add the `PortalSettings` interface, add `portalSettings` to `GlobalRules`, and add the optional `settings` parameter to `TileRule.canPlace`:

```ts
export interface PortalSettings {
  /** When true, teleporters may not be placed adjacent to pizza boxes. */
  noPizzaAdjacent: boolean;
  /** Adjacency metric for noPizzaAdjacent. 'chebyshev' = 8-dir, 'manhattan' = 4-dir. */
  pizzaAdjacencyMetric: 'chebyshev' | 'manhattan';
  /** When non-null, teleporters must be at least this many cells apart (Chebyshev). */
  minDistance: number | null;
}

export interface GlobalRules {
  minSize: number;
  maxSize: number;
  startExclusionRadius: number;
  movementDirections: '4' | '8';
  checkAccessibility: (grid: Grid) => boolean;
  oneTilePerCell: boolean;
  portalSettings: PortalSettings;
}

export interface TileRule {
  type: TileType;
  label: string;
  icon: string;
  color: string;
  variantColors?: Record<string, string>;
  variants?: string[];
  count: (players: number) => number;
  variantAssignment?: (players: number) => string[];
  canPlace: (
    grid: Grid,
    r: number,
    c: number,
    variant?: string,
    settings?: PortalSettings,
  ) => boolean;
}
```

**Step 2: Verify typecheck**

Run: `npm run build`
Expected: Type errors only in `config/rules.ts` (missing `portalSettings` on `GLOBAL_RULES`) — these will be fixed in Task 2. Do not expect a clean build yet.

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add PortalSettings type and extend TileRule.canPlace signature"
```

---

## Task 2: Add default PortalSettings to GLOBAL_RULES

**Files:**
- Modify: `src/config/rules.ts:124-131`

**Step 1: Add the default portalSettings to GLOBAL_RULES**

Update the `GLOBAL_RULES` export to include `portalSettings`:

```ts
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
```

**Step 2: Verify typecheck**

Run: `npm run build`
Expected: Clean build (the only missing field is now supplied). If errors remain, fix them before continuing.

**Step 3: Run existing tests**

Run: `npm test`
Expected: All existing tests pass. (No behavior change yet — the new param is optional and unused by predicates.)

**Step 4: Commit**

```bash
git add src/config/rules.ts
git commit -m "feat: add default portalSettings to GLOBAL_RULES"
```

---

## Task 3: Add chebyshev, isAdjacentToPizza, respectsMinDistance helpers

**Files:**
- Modify: `src/config/rules.ts` (add helpers above `TILE_RULES`)
- Test: `src/config/rules.test.ts`

**Step 1: Write failing tests for the helpers**

Add to `src/config/rules.test.ts` (after existing tests, inside the `describe('tile rule config', ...)` block — but if you prefer a separate describe, add a new `describe('portal helpers', ...)` block at the bottom of the file):

```ts
import { chebyshev, isAdjacentToPizza, respectsMinDistance } from './rules';

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
    expect(respectsMinDistance(g, 2, 0, 2)).toBe(false); // chebyshev 2 < 2? no, 2 is not < 2
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
```

Note: remove the duplicate `isAdjacentToPizza(g, 2, 2, 'manhattan')` assertion's `false` expectation if it conflicts — diagonal under manhattan is distance 2, which is not adjacent. Keep the test as written; it documents the intended behavior.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/config/rules.test.ts`
Expected: FAIL — `chebyshev`, `isAdjacentToPizza`, `respectsMinDistance` are not exported from `./rules`.

**Step 3: Implement the helpers**

Add to `src/config/rules.ts` (above `TILE_RULES`, below `genericCanPlace`):

```ts
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
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/config/rules.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config/rules.ts src/config/rules.test.ts
git commit -m "feat: add chebyshev, isAdjacentToPizza, respectsMinDistance helpers"
```

---

## Task 4: Make the teleporter canPlace predicate settings-aware

**Files:**
- Modify: `src/config/rules.ts` (replace `genericCanPlace` usage for teleporter with a new `teleporterCanPlace`)
- Test: `src/config/rules.test.ts`

**Step 1: Write failing tests for the new teleporter canPlace behavior**

Add to the `describe('portal helpers', ...)` block (or a new `describe('teleporter canPlace with settings', ...)` block):

```ts
describe('teleporter canPlace with settings', () => {
  it('noPizzaAdjacent chebyshev: blocks 8-dir adjacency', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    const settings = { noPizzaAdjacent: true, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    expect(TILE_RULES.teleporter.canPlace(g, 2, 2, 'square', settings)).toBe(false); // diagonal
    expect(TILE_RULES.teleporter.canPlace(g, 2, 3, 'square', settings)).toBe(false); // up
    expect(TILE_RULES.teleporter.canPlace(g, 0, 0, 'square', settings)).toBe(true);
  });

  it('noPizzaAdjacent manhattan: blocks only 4-dir adjacency', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    const settings = { noPizzaAdjacent: true, pizzaAdjacencyMetric: 'manhattan' as const, minDistance: null };
    expect(TILE_RULES.teleporter.canPlace(g, 2, 3, 'square', settings)).toBe(false); // up
    expect(TILE_RULES.teleporter.canPlace(g, 2, 2, 'square', settings)).toBe(true);  // diagonal allowed
  });

  it('noPizzaAdjacent false: adjacent pizza allowed (current behavior)', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    expect(TILE_RULES.teleporter.canPlace(g, 2, 2, 'square', settings)).toBe(true);
  });

  it('no settings: adjacent pizza allowed (backward compat)', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    expect(TILE_RULES.teleporter.canPlace(g, 2, 2, 'square')).toBe(true);
  });

  it('minDistance 2: blocks teleporter at chebyshev 1', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'teleporter', variant: 'square' };
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 2 };
    expect(TILE_RULES.teleporter.canPlace(g, 4, 4, 'triangle', settings)).toBe(false); // chebyshev 1
    expect(TILE_RULES.teleporter.canPlace(g, 5, 5, 'triangle', settings)).toBe(true);  // chebyshev 2
  });

  it('minDistance 3: blocks teleporter at chebyshev 2', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'teleporter', variant: 'square' };
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 3 };
    expect(TILE_RULES.teleporter.canPlace(g, 5, 3, 'triangle', settings)).toBe(false); // chebyshev 2
    expect(TILE_RULES.teleporter.canPlace(g, 6, 3, 'triangle', settings)).toBe(true);  // chebyshev 3
  });

  it('minDistance null: no distance constraint', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'teleporter', variant: 'square' };
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    expect(TILE_RULES.teleporter.canPlace(g, 4, 4, 'triangle', settings)).toBe(true);
  });

  it('both rules can combine: pizza-adjacent AND too-close teleporter both fail', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    g[2][2] = { tile: 'teleporter', variant: 'square' };
    const settings = { noPizzaAdjacent: true, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 3 };
    // (2,3) is adjacent to pizza at (3,3) AND chebyshev-1 from teleporter at (2,2)
    expect(TILE_RULES.teleporter.canPlace(g, 2, 3, 'triangle', settings)).toBe(false);
  });

  it('non-teleporter rules ignore the settings param', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    const settings = { noPizzaAdjacent: true, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 2 };
    // grave, fence, pizza canPlace should be unaffected by settings
    expect(TILE_RULES.grave.canPlace(g, 0, 0, undefined, settings)).toBe(true);
    expect(TILE_RULES.fence.canPlace(g, 0, 0, undefined, settings)).toBe(true);
    expect(TILE_RULES.pizza.canPlace(g, 0, 0, 'pepper', settings)).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/config/rules.test.ts`
Expected: FAIL — the teleporter rule still uses `genericCanPlace` which ignores settings, so the `noPizzaAdjacent`/`minDistance` assertions fail.

**Step 3: Implement `teleporterCanPlace` and wire it into `TILE_RULES.teleporter`**

Add to `src/config/rules.ts` (below `genericCanPlace`, above the `chebyshev` helper or grouped with the other helpers):

```ts
import type { Grid, TileType, GlobalRules, PortalSettings } from '../types';

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
  if (settings?.minDistance != null && settings.minDistance > 0) {
    if (!respectsMinDistance(grid, r, c, settings.minDistance)) return false;
  }
  return true;
}
```

Then update the `teleporter` entry in `TILE_RULES` to use `teleporterCanPlace` instead of `genericCanPlace`:

```ts
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
```

Note: the `PortalSettings` import must be added to the existing type import line at the top of `rules.ts`:

```ts
import type { Grid, TileRule, TileType, GlobalRules, PortalSettings } from '../types';
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/config/rules.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass. Existing generator/validator tests may now fail if they happen to generate boards that violate the *default* `portalSettings` (adjacency ON). Those tests call `validate`/`generate` without settings — see Task 5 & 6 for the fix. If failures appear here, they will be resolved by Tasks 5–6.

**Step 6: Commit**

```bash
git add src/config/rules.ts src/config/rules.test.ts
git commit -m "feat: make teleporter canPlace settings-aware"
```

---

## Task 5: Thread PortalSettings through the validator

**Files:**
- Modify: `src/engine/validator.ts`
- Test: `src/engine/validator.test.ts`

**Step 1: Write failing tests**

Add to `src/engine/validator.test.ts`:

```ts
import { GLOBAL_RULES } from '../config/rules';

describe('validator with portal settings', () => {
  it('teleporter adjacent to pizza violates when noPizzaAdjacent on (chebyshev)', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    g[2][2] = { tile: 'teleporter', variant: 'square' };
    const v = validate(g, GLOBAL_RULES.portalSettings);
    expect(v.some((x) => x.row === 2 && x.col === 2)).toBe(true);
  });

  it('teleporter adjacent to pizza does NOT violate when noPizzaAdjacent off', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'pizza', variant: 'pepper' };
    g[2][2] = { tile: 'teleporter', variant: 'square' };
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    expect(validate(g, settings)).toEqual([]);
  });

  it('two teleporters too close violates when minDistance set', () => {
    const g = createEmptyGrid(7);
    g[3][3] = { tile: 'teleporter', variant: 'square' };
    g[3][4] = { tile: 'teleporter', variant: 'triangle' };
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 2 };
    const v = validate(g, settings);
    expect(v.some((x) => x.row === 3 && x.col === 3)).toBe(true);
    expect(v.some((x) => x.row === 3 && x.col === 4)).toBe(true);
  });

  it('teleporter far from pizza and other teleporters is valid', () => {
    const g = createEmptyGrid(7);
    g[0][0] = { tile: 'pizza', variant: 'pepper' };
    g[6][6] = { tile: 'teleporter', variant: 'square' };
    const settings = { noPizzaAdjacent: true, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 2 };
    expect(validate(g, settings)).toEqual([]);
  });
});
```

Also: the existing `validator.test.ts` tests call `validate(g)` with no settings. These must keep working. Update the `validate` signature so the second param is optional, defaulting to `GLOBAL_RULES.portalSettings`. Then the existing tests exercise the default (adjacency ON) — verify they still pass; if any existing test sets up a teleporter adjacent to a pizza and expects no violation, that test must be updated to pass explicit "off" settings, OR the test board must be adjusted. Inspect the existing tests: the "valid setup has no violations" test at validator.test.ts:50-77 places teleporters at (3,0), (3,6), (1,3) and pizza at (4,1), (4,5). Check distances:
- (3,0) vs pizza (4,1): chebyshev = 1 → ADJACENT. This test will now report a violation under default settings.

**Action:** update that existing test to pass explicit settings `{ noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev', minDistance: null }` so it asserts no violations under the relaxed rules (which is what it was originally verifying):

```ts
it('valid setup has no violations', () => {
  const g = createEmptyGrid(7);
  // ...existing board setup...
  const relaxedSettings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
  const v = validate(g, relaxedSettings);
  expect(Array.isArray(v)).toBe(true);
  expect(v).toEqual([]);
});
```

(If the original test only asserted `Array.isArray(v)` and not `v.length === 0`, you may keep the weaker assertion — but tightening to `toEqual([])` with relaxed settings is cleaner.)

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/validator.test.ts`
Expected: FAIL — `validate` doesn't accept a second parameter yet; TypeScript/runtime errors.

**Step 3: Implement the settings parameter in validate**

Update `src/engine/validator.ts`:

```ts
import { GLOBAL_RULES } from '../config/rules';
import type { PortalSettings, Grid, Violation } from '../types';

export function validate(grid: Grid, settings: PortalSettings = GLOBAL_RULES.portalSettings): Violation[] {
  const violations: Violation[] = [];
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell) continue;

      const testGrid = grid.map((row, ri) =>
        row.map((x, ci) => (ri === r && ci === c ? null : x)),
      );
      const rule = TILE_RULES[cell.tile];
      if (!rule.canPlace(testGrid, r, c, cell.variant, settings)) {
        violations.push({
          row: r,
          col: c,
          message: `${rule.label} at (${r},${c}) violates placement rules`,
        });
      }
    }
  }

  if (!GLOBAL_RULES.checkAccessibility(grid)) {
    violations.push({
      row: -1,
      col: -1,
      message: 'Grid is not fully accessible: fences block access to some cells',
    });
  }

  return violations;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/validator.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: `engine/generator.test.ts` may now fail because it calls `validate(g!)` (no settings) and the default settings (adjacency ON) may reject generated boards that have teleporters adjacent to pizza. This will be fixed in Task 6. Other test files should pass.

**Step 6: Commit**

```bash
git add src/engine/validator.ts src/engine/validator.test.ts
git commit -m "feat: thread PortalSettings through validate"
```

---

## Task 6: Thread PortalSettings through the generator

**Files:**
- Modify: `src/engine/generator.ts`
- Test: `src/engine/generator.test.ts`

**Step 1: Write failing tests**

Add to `src/engine/generator.test.ts`:

```ts
import { GLOBAL_RULES } from '../config/rules';

describe('generator with portal settings', () => {
  it('generated board has no teleporter adjacent to pizza under default settings', () => {
    const g = generate(7, 2, GLOBAL_RULES.portalSettings)!;
    expect(g).not.toBeNull();
    expect(validate(g, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  it('generated board respects minDistance 3', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 3 };
    const g = generate(7, 2, settings)!;
    expect(g).not.toBeNull();
    expect(validate(g, settings)).toEqual([]);
  });

  it('generated board under relaxed settings is valid', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    const g = generate(7, 2, settings)!;
    expect(g).not.toBeNull();
    expect(validate(g, settings)).toEqual([]);
  });
});
```

Also: the existing `generator.test.ts` tests call `generate(7, 2)` with no settings and then `validate(g!)` with no settings. Under the new default (adjacency ON), generated boards must satisfy the adjacency rule. Update the existing tests to pass `GLOBAL_RULES.portalSettings` explicitly to both `generate` and `validate` so they assert validity under the default rules:

For each existing test that does `generate(N, p)` followed by `validate(g!)`:
- Change to `generate(N, p, GLOBAL_RULES.portalSettings)` and `validate(g!, GLOBAL_RULES.portalSettings)`.
- The "returns null for impossible tiny grid" test calls `generate(5, 4)` and expects `null` — add a third arg `GLOBAL_RULES.portalSettings` (the result is still `null` regardless).

If any existing test fails after this change because the generator cannot satisfy the default adjacency rule on a small board, keep the test but pass relaxed settings `{ noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev', minDistance: null }` so the test continues to verify generator mechanics without the new constraint. Document this with a comment.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/generator.test.ts`
Expected: FAIL — `generate` doesn't accept a third parameter yet.

**Step 3: Implement the settings parameter in generate**

Update `src/engine/generator.ts`:

```ts
import type { Grid, Cell, TileType, PortalSettings } from '../types';
import { GLOBAL_RULES } from '../config/rules';

// ...shuffle, buildPlacementOrder unchanged...

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

    const isLastFence = unit.type === 'fence' && fencePlaced + 1 === totalFences;
    if (isLastFence && !isAccessible(next)) continue;

    const result = backtrack(
      next, units, idx + 1,
      unit.type === 'fence' ? fencePlaced + 1 : fencePlaced,
      totalFences, budget, settings,
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
  const RESTARTS = 4;
  for (let i = 0; i < RESTARTS; i++) {
    const budget = { left: MAX_ATTEMPTS };
    const result = backtrack(createEmptyGrid(size), units, 0, 0, totalFences, budget, settings);
    if (result) return result;
  }
  return null;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/generator.test.ts`
Expected: PASS. If the generator struggles to find a valid 7×7/2-player board under default adjacency settings within the attempt budget, increase `RESTARTS` or `MAX_ATTEMPTS` modestly — but first verify the constraint isn't truly infeasible. (It shouldn't be: 3 teleporters on a 49-cell grid with 2 pizzas have plenty of non-adjacent cells.)

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/engine/generator.ts src/engine/generator.test.ts
git commit -m "feat: thread PortalSettings through generate"
```

---

## Task 7: Thread PortalSettings through useGrid

**Files:**
- Modify: `src/hooks/useGrid.ts`
- Test: `src/hooks/useGrid.test.ts`

**Step 1: Write failing tests**

Add to `src/hooks/useGrid.test.ts`:

```ts
import { GLOBAL_RULES } from '../config/rules';

describe('useGrid with portal settings', () => {
  it('accepts portalSettings and flags adjacent teleporter+pizza when on', () => {
    const { result } = renderHook(() => useGrid(GLOBAL_RULES.portalSettings));
    act(() => {
      result.current.place(3, 3, { type: 'pizza', variant: 'pepper' });
      result.current.place(2, 2, { type: 'teleporter', variant: 'square' });
    });
    expect(result.current.violations.some((v) => v.row === 2 && v.col === 2)).toBe(true);
  });

  it('does not flag adjacent teleporter+pizza when noPizzaAdjacent off', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    const { result } = renderHook(() => useGrid(settings));
    act(() => {
      result.current.place(3, 3, { type: 'pizza', variant: 'pepper' });
      result.current.place(2, 2, { type: 'teleporter', variant: 'square' });
    });
    expect(result.current.violations).toEqual([]);
  });

  it('re-validates when portalSettings change (rerender with new settings)', () => {
    const relaxed = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: null };
    const strict = { ...relaxed, noPizzaAdjacent: true };
    const { result, rerender } = renderHook(({ settings }) => useGrid(settings), {
      initialProps: { settings: relaxed },
    });
    act(() => {
      result.current.place(3, 3, { type: 'pizza', variant: 'pepper' });
      result.current.place(2, 2, { type: 'teleporter', variant: 'square' });
    });
    expect(result.current.violations).toEqual([]);
    rerender({ settings: strict });
    expect(result.current.violations.some((v) => v.row === 2 && v.col === 2)).toBe(true);
  });

  it('generate passes settings to engine (respects minDistance)', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, minDistance: 3 };
    const { result } = renderHook(() => useGrid(settings));
    act(() => result.current.generate(2));
    // All teleporter pairs must be >= 3 apart (chebyshev).
    const teleporters: Array<{ r: number; c: number }> = [];
    result.current.grid.forEach((row, r) => row.forEach((cell, c) => {
      if (cell?.tile === 'teleporter') teleporters.push({ r, c });
    }));
    for (let i = 0; i < teleporters.length; i++) {
      for (let j = i + 1; j < teleporters.length; j++) {
        const d = Math.max(
          Math.abs(teleporters[i].r - teleporters[j].r),
          Math.abs(teleporters[i].c - teleporters[j].c),
        );
        expect(d).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
```

Also: existing `useGrid.test.ts` tests call `renderHook(() => useGrid())` with no arg. Update `useGrid` to accept an optional `portalSettings` that defaults to `GLOBAL_RULES.portalSettings`, so existing tests keep working without changes. Verify the existing "generate produces a valid grid" test still passes under default settings (adjacency ON) — if the generated board happens to place a teleporter adjacent to pizza and the test asserts `violations` is empty, it will fail. Update that test to pass `GLOBAL_RULES.portalSettings` explicitly to both `useGrid` and assert `violations` is empty under the default rules; if the generator can't reliably satisfy the default on a 7×7/2-player board within budget, pass relaxed settings to that specific test and add a comment.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/hooks/useGrid.test.ts`
Expected: FAIL — `useGrid` doesn't accept a parameter yet.

**Step 3: Implement the portalSettings parameter in useGrid**

Update `src/hooks/useGrid.ts`:

```ts
import { useCallback, useMemo, useState } from 'react';
import type { ActiveTile, Grid, PortalSettings } from '../types';
import { createEmptyGrid, cloneGrid } from '../engine/grid-helpers';
import { validate } from '../engine/validator';
import { generate as generateGrid } from '../engine/generator';
import { GLOBAL_RULES } from '../config/rules';

const DEFAULT_SIZE = 7;

export function useGrid(portalSettings: PortalSettings = GLOBAL_RULES.portalSettings) {
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(DEFAULT_SIZE));
  const [error, setError] = useState<string | null>(null);

  const place = useCallback((r: number, c: number, active: ActiveTile) => {
    setError(null);
    setGrid((g) => {
      if (g[r][c] !== null) return g;
      const next = cloneGrid(g);
      next[r][c] = { tile: active.type, variant: active.variant };
      return next;
    });
  }, []);

  const remove = useCallback((r: number, c: number) => {
    setError(null);
    setGrid((g) => {
      if (g[r][c] === null) return g;
      const next = cloneGrid(g);
      next[r][c] = null;
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setGrid((g) => createEmptyGrid(g.length));
  }, []);

  const resize = useCallback((size: number) => {
    setError(null);
    setGrid(createEmptyGrid(size));
  }, []);

  const generate = useCallback((players: number) => {
    setError(null);
    setGrid((g) => {
      const result = generateGrid(g.length, players, portalSettings);
      if (!result) {
        setError('No valid setup found for these settings.');
        return g;
      }
      return result;
    });
  }, [portalSettings]);

  const violations = useMemo(() => validate(grid, portalSettings), [grid, portalSettings]);

  return { grid, violations, error, place, remove, clear, resize, generate };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/hooks/useGrid.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/hooks/useGrid.ts src/hooks/useGrid.test.ts
git commit -m "feat: thread PortalSettings through useGrid"
```

---

## Task 8: Add portal settings controls to Controls component

**Files:**
- Modify: `src/components/Controls.tsx`
- Test: `src/components/Controls.test.tsx`

**Step 1: Write failing tests**

Add to `src/components/Controls.test.tsx`:

```ts
import type { PortalSettings } from '../types';

const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  noPizzaAdjacent: true,
  pizzaAdjacencyMetric: 'chebyshev',
  minDistance: null,
};

describe('Controls portal settings', () => {
  it('renders the portal-pizza adjacency checkbox checked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/portals not adjacent to pizza/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('renders the metric select when adjacency is enabled', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/adjacency metric/i)).toBeInTheDocument();
  });

  it('does not render the metric select when adjacency is disabled', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, noPizzaAdjacent: false };
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/adjacency metric/i)).not.toBeInTheDocument();
  });

  it('toggling adjacency checkbox calls onPortalSettingsChange', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    const checkbox = screen.getByLabelText(/portals not adjacent to pizza/i);
    fireEvent.click(checkbox);
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      noPizzaAdjacent: false,
    });
  });

  it('changing metric select calls onPortalSettingsChange', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/adjacency metric/i), { target: { value: 'manhattan' } });
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      pizzaAdjacencyMetric: 'manhattan',
    });
  });

  it('renders min-distance checkbox unchecked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/min portal distance/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('enabling min distance defaults threshold to 2', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/min portal distance/i));
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      minDistance: 2,
    });
  });

  it('renders threshold select when min distance is enabled', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 3 };
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/min distance threshold/i)).toHaveValue('3');
  });

  it('changing threshold select calls onPortalSettingsChange', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 2 };
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/min distance threshold/i), { target: { value: '4' } });
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...settings,
      minDistance: 4,
    });
  });

  it('disabling min distance sets minDistance to null', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 3 };
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/min portal distance/i));
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...settings,
      minDistance: null,
    });
  });
});
```

Also update the existing `Controls.test.tsx` tests to pass the new required `portalSettings` and `onPortalSettingsChange` props. Every existing `render(<Controls .../>)` call needs `portalSettings={DEFAULT_PORTAL_SETTINGS}` and `onPortalSettingsChange={vi.fn()}` added. Add the `DEFAULT_PORTAL_SETTINGS` constant at the top of the file (or import from `../config/rules` via `GLOBAL_RULES.portalSettings`).

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/Controls.test.tsx`
Expected: FAIL — `Controls` doesn't accept the new props.

**Step 3: Implement the controls**

Update `src/components/Controls.tsx`:

```tsx
import type { PortalSettings } from '../types';

interface Props {
  players: number;
  size: number;
  portalSettings: PortalSettings;
  onPlayersChange: (n: number) => void;
  onSizeChange: (n: number) => void;
  onGenerate: () => void;
  onClear: () => void;
  onPortalSettingsChange: (settings: PortalSettings) => void;
}

export function Controls({
  players,
  size,
  portalSettings,
  onPlayersChange,
  onSizeChange,
  onGenerate,
  onClear,
  onPortalSettingsChange,
}: Props) {
  return (
    <div className="controls">
      <label>
        Players
        <select
          aria-label="players"
          value={players}
          onChange={(e) => onPlayersChange(Number(e.target.value))}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <label>
        Size
        <input
          aria-label="size"
          type="number"
          min={5}
          max={10}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        />
      </label>

      <label>
        <input
          type="checkbox"
          aria-label="portals not adjacent to pizza"
          checked={portalSettings.noPizzaAdjacent}
          onChange={(e) =>
            onPortalSettingsChange({
              ...portalSettings,
              noPizzaAdjacent: e.target.checked,
            })
          }
        />
        Portals not adjacent to pizza
      </label>
      {portalSettings.noPizzaAdjacent && (
        <label>
          Adjacency metric
          <select
            aria-label="adjacency metric"
            value={portalSettings.pizzaAdjacencyMetric}
            onChange={(e) =>
              onPortalSettingsChange({
                ...portalSettings,
                pizzaAdjacencyMetric: e.target.value as 'chebyshev' | 'manhattan',
              })
            }
          >
            <option value="chebyshev">Chebyshev (8-dir)</option>
            <option value="manhattan">Manhattan (4-dir)</option>
          </select>
        </label>
      )}

      <label>
        <input
          type="checkbox"
          aria-label="min portal distance"
          checked={portalSettings.minDistance != null}
          onChange={(e) =>
            onPortalSettingsChange({
              ...portalSettings,
              minDistance: e.target.checked ? 2 : null,
            })
          }
        />
        Min portal distance
      </label>
      {portalSettings.minDistance != null && (
        <label>
          Min distance threshold
          <select
            aria-label="min distance threshold"
            value={portalSettings.minDistance}
            onChange={(e) =>
              onPortalSettingsChange({
                ...portalSettings,
                minDistance: Number(e.target.value),
              })
            }
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      <button type="button" onClick={onGenerate}>Generate</button>
      <button type="button" onClick={onClear}>Clear</button>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/Controls.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/Controls.tsx src/components/Controls.test.tsx
git commit -m "feat: add portal settings controls to Controls"
```

---

## Task 9: Wire portalSettings state into App

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Step 1: Write failing test**

Add to `src/App.test.tsx`:

```ts
it('renders portal-pizza adjacency checkbox checked by default', () => {
  render(<App />);
  const checkbox = screen.getByLabelText(/portals not adjacent to pizza/i) as HTMLInputElement;
  expect(checkbox.checked).toBe(true);
});
```

**Step 2: Run tests to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — `App` doesn't render the Controls with portal settings yet (or the checkbox isn't found because `Controls` isn't passed the props).

**Step 3: Wire portalSettings into App**

Update `src/App.tsx`:

```tsx
import { useState } from 'react';
import type { ActiveTile } from './types';
import { useGrid } from './hooks/useGrid';
import { Board } from './components/Board';
import { TilePalette } from './components/TilePalette';
import { Controls } from './components/Controls';
import { Violations } from './components/Violations';
import { GLOBAL_RULES } from './config/rules';
import './App.css';

export default function App() {
  const [players, setPlayers] = useState(2);
  const [active, setActive] = useState<ActiveTile | null>(null);
  const [portalSettings, setPortalSettings] = useState(GLOBAL_RULES.portalSettings);
  const { grid, violations, error, place, remove, clear, resize, generate } = useGrid(portalSettings);

  const handlePlace = (r: number, c: number) => {
    if (active) place(r, c, active);
  };
  const handleSizeChange = (n: number) => {
    if (n < 5 || n > 10) return;
    const hasTiles = grid.some((row) => row.some(Boolean));
    if (!hasTiles || window.confirm('Changing the grid size will clear the current setup. Continue?')) {
      resize(n);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ghost Town Setup</h1>
        <Controls
          players={players}
          size={grid.length}
          portalSettings={portalSettings}
          onPlayersChange={setPlayers}
          onSizeChange={handleSizeChange}
          onGenerate={() => generate(players)}
          onClear={clear}
          onPortalSettingsChange={setPortalSettings}
        />
      </header>
      <main className="app-main">
        <TilePalette active={active} onSelect={setActive} />
        <Board
          grid={grid}
          violations={violations}
          activeTile={active ?? { type: 'grave' }}
          onPlace={handlePlace}
          onRemove={remove}
        />
        <Violations violations={violations} error={error} />
      </main>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/App.test.tsx`
Expected: PASS. The existing "clicking Generate fills the board" test must still pass — the generator now uses default `portalSettings` (adjacency ON) and should still find a valid 7×7/2-player board. If it fails, verify the generator isn't returning `null` due to the new constraint; if it is, the existing test may need to wait/act differently, but the generator should succeed.

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 6: Run lint and typecheck**

Run: `npm run lint && npm run build`
Expected: Clean.

**Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire portalSettings state into App"
```

---

## Task 10: Final verification

**Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

**Step 3: Run typecheck/build**

Run: `npm run build`
Expected: Clean build.

**Step 4: Manual smoke test (optional)**

Run: `npm run dev`
- Load the app in a browser.
- Verify the "Portals not adjacent to pizza" checkbox is checked by default and the Chebyshev/Manhattan select is visible.
- Click Generate — the board should populate with no violations.
- Uncheck the adjacency checkbox — the metric select should disappear; board should re-validate (no new violations if it was valid).
- Check "Min portal distance" — the threshold select should appear with default value 2.
- Generate again — verify no teleporters are within Chebyshev-1 of each other.
- Set min distance to 5 and generate on a 5×5 grid — expect "No valid setup found" (infeasible).

**Step 5: Final commit (if any cleanup)**

If the smoke test surfaced issues, fix and commit them. Otherwise, no commit needed.