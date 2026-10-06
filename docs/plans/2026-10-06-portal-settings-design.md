# Portal Optional Settings — Design

## Overview

Add two user-configurable, optional rules governing teleporter (portal) placement:

1. **Portals not adjacent to pizza** — a toggle that, when enabled, forbids placing a teleporter adjacent to any pizza box. The adjacency metric is user-selectable: Chebyshev (8-direction) or Manhattan (4-direction).
2. **Minimum distance between portals** — a toggle that, when enabled, requires every pair of teleporters to be at least N cells apart (Chebyshev distance). The threshold N is user-configurable in the range 1–7.

Both settings default such that the adjacency rule is ON (Chebyshev) and the min-distance rule is OFF, showcasing the new rules while preserving the option to disable them.

## Context

The existing architecture (see `2026-10-06-board-game-setup-design.md`) is config-driven: `config/rules.ts` defines a `TileRule` per tile type with a `canPlace` predicate, and `GlobalRules` captures cross-cutting constraints. The validator re-runs each cell's `canPlace` against the grid (treating the cell as empty); the generator uses the same predicates as pruning during backtracking. This design extends that architecture rather than introducing a parallel mechanism.

## Approach

**Chosen: Settings threaded through predicates.** A `PortalSettings` object is passed via an optional `settings` parameter on `TileRule.canPlace`. Only the teleporter rule consumes it; other rules ignore it. The validator and generator both thread `settings` into their `canPlace` calls, so the two code paths stay in sync automatically (the generator already re-runs neighbor `canPlace` after each placement).

Rejected alternatives:
- *Separate cross-tile rule functions* — duplicates the rule logic across validator and generator, risking drift.
- *Settings-aware rule factory* — larger refactor; every `TILE_RULES` import becomes a function call; high test churn.

## Data Model

New types in `types.ts`:

```ts
export interface PortalSettings {
  /** When true, teleporters may not be placed adjacent to pizza boxes. */
  noPizzaAdjacent: boolean;
  /** Adjacency metric for noPizzaAdjacent. 'chebyshev' = 8-dir, 'manhattan' = 4-dir. */
  pizzaAdjacencyMetric: 'chebyshev' | 'manhattan';
  /** When non-null, teleporters must be at least this many cells apart (Chebyshev). */
  minDistance: number | null;
}
```

`GlobalRules` gains a `portalSettings` field:

```ts
export interface GlobalRules {
  minSize: number;
  maxSize: number;
  startExclusionRadius: number;
  movementDirections: '4' | '8';
  checkAccessibility: (grid: Grid) => boolean;
  oneTilePerCell: boolean;
  portalSettings: PortalSettings;
}
```

`TileRule.canPlace` gains an optional `settings` parameter:

```ts
canPlace: (
  grid: Grid, r: number, c: number,
  variant?: string,
  settings?: PortalSettings,
) => boolean;
```

**Defaults** in `config/rules.ts`:

```ts
portalSettings: {
  noPizzaAdjacent: true,
  pizzaAdjacencyMetric: 'chebyshev',
  minDistance: null,
}
```

Non-teleporter rules ignore the new `settings` param (optional, no behavior change).

## Predicates (config/rules.ts)

Three new pure helpers:

```ts
function chebyshev(r1: number, c1: number, r2: number, c2: number): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

function isAdjacentToPizza(
  grid: Grid, r: number, c: number,
  metric: 'chebyshev' | 'manhattan',
): boolean {
  const dirs = metric === 'chebyshev' ? 8 : 4;
  for (const { r: nr, c: nc } of getNeighbors(grid, r, c, dirs)) {
    if (grid[nr][nc]?.tile === 'pizza') return true;
  }
  return false;
}

function respectsMinDistance(
  grid: Grid, r: number, c: number, minDistance: number,
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

The teleporter rule's `canPlace` is updated to consult `settings`:

```ts
function teleporterCanPlace(
  grid: Grid, r: number, c: number,
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

Distance is symmetric, so placing a new teleporter can only violate *its own* min-distance rule (caught by its own `canPlace`). The generator's existing neighbor re-check loop needs no extra cross-tile pass for min-distance.

## Wiring

### useGrid

`useGrid` accepts `portalSettings` and passes it to `validate` and `generate`. Placement remains ungated (the validator flags violations after the fact, preserving the existing "place then see red ring" UX).

```ts
export function useGrid(portalSettings: PortalSettings) {
  // ...
  const violations = useMemo(
    () => validate(grid, portalSettings),
    [grid, portalSettings],
  );
  const generate = useCallback((players: number) => {
    setGrid((g) => {
      const result = generateGrid(g.length, players, portalSettings);
      // ...
    });
  }, [portalSettings]);
  // place/remove unchanged
}
```

Because `useMemo` depends on `portalSettings`, toggling a setting immediately re-validates the current grid — existing boards that violate a newly-enabled rule light up red.

### validator.ts

`validate(grid, settings)` passes `settings` into every `canPlace` call:

```ts
export function validate(grid: Grid, settings: PortalSettings): Violation[] {
  // per-cell:
  if (!rule.canPlace(testGrid, r, c, cell.variant, settings)) {
    violations.push({ row: r, col: c, message: `${rule.label} at (${r},${c}) violates placement rules` });
  }
  // accessibility check unchanged
}
```

When the validator tests an existing teleporter, `respectsMinDistance` scans the grid for other teleporters; the test grid has the cell itself nulled and the loop skips `nr === r && nc === c`, so the teleporter count is correct.

### generator.ts

`generate(size, players, settings)` threads `settings` into every `canPlace` call inside `backtrack` — both the primary placement check and the neighbor re-check:

```ts
if (!rule.canPlace(grid, r, c, unit.variant, settings)) continue;
// ...
if (!nRule.canPlace(testGrid, nr, nc, cell.variant, settings)) { neighborOk = false; break; }
```

No other generator changes required.

### Controls.tsx

Extended with two new controls. Props gain `portalSettings` and `onPortalSettingsChange`:

- **Adjacency:** a checkbox "Portals not adjacent to pizza" + a `<select>` for metric (Chebyshev/Manhattan), shown only when checked.
- **Min distance:** a checkbox "Min portal distance" + a `<select>` (1–7), shown only when checked. Threshold defaults to 2 when first enabled.

Layout (added to the existing Controls bar alongside Players/Size):

```
Players  Size  | [☑ Portals not adjacent to pizza] [Chebyshev ▼]  [☐ Min portal distance] [2 ▼]  Generate  Clear
```

### App.tsx

Owns `portalSettings` state (defaulted from `GLOBAL_RULES.portalSettings`), passes it to `useGrid` and `Controls`:

```tsx
const [portalSettings, setPortalSettings] = useState(GLOBAL_RULES.portalSettings);
const { grid, violations, error, ... } = useGrid(portalSettings);
```

Generator re-run is not automatic on settings change (consistent with how player-count changes behave). User clicks Generate.

## Edge Cases

1. **`minDistance: 1`** — Chebyshev-1 means "not adjacent." Valid within the 1–7 range; forbids any two teleporters from touching (even diagonally).
2. **`minDistance` on small grids** — on a 5×5 grid with 3 teleporters and `minDistance: 5`, generation may be infeasible. The generator returns `null` → UI shows "No valid setup found for these settings." No special handling.
3. **Both rules + metric interaction** — `noPizzaAdjacent` uses the user-selected metric; `minDistance` always uses Chebyshev. The two settings are independent; a teleporter could pass one check and fail the other.
4. **Settings change on a populated board** — re-validation is immediate via `useMemo`. Enabling `minDistance: 3` on a board with close teleporters flags those cells red instantly. No auto-regenerate.
5. **`minDistance` off → `null`** — unchecking sets `minDistance: null` (not `0`) so the predicate skips the check. Semantically clearer than `0`.
6. **Metric select visibility** — the metric `<select>` only renders when `noPizzaAdjacent` is checked. Disabling adjacency hides it but retains the last metric value; re-enabling restores it. No data loss on toggle.
7. **Threshold default** — when the min-distance checkbox is first checked, the threshold defaults to `2`. Subsequent toggles preserve the user's chosen value.

## Behavior Summary

| Setting | Default | Off state | On state |
|---|---|---|---|
| `noPizzaAdjacent` | ON | Teleporters may be adjacent to pizza | Teleporters blocked from cells adjacent to pizza (per metric) |
| `pizzaAdjacencyMetric` | `chebyshev` | n/a (hidden) | 8-dir or 4-dir adjacency check |
| `minDistance` | `null` (OFF) | No teleporter-pair distance constraint | Teleporter pairs must be ≥N apart (Chebyshev) |

## Testing

### config/rules.test.ts

- `teleporter.canPlace` with `noPizzaAdjacent: true, chebyshev` → false when pizza in any of 8 neighbors; true when pizza is 2 cells away.
- Same with `manhattan` → false only for orthogonal neighbors; diagonal pizza allowed.
- `teleporter.canPlace` with `noPizzaAdjacent: false` → adjacent pizza allowed (current behavior preserved).
- `teleporter.canPlace` with `minDistance: 2` → false when another teleporter is Chebyshev-1 away (orthogonal or diagonal); true at Chebyshev-2.
- `teleporter.canPlace` with `minDistance: 3` → false at Chebyshev-2, true at Chebyshev-3.
- `teleporter.canPlace` with `minDistance: null` → no distance constraint (current behavior).
- Default `GLOBAL_RULES.portalSettings` equals `{ noPizzaAdjacent: true, pizzaAdjacencyMetric: 'chebyshev', minDistance: null }`.
- Non-teleporter rules (`grave`, `fence`, `pizza`) ignore the `settings` param — behavior unchanged with/without it.

### engine/validator.test.ts

- Grid with a teleporter adjacent to pizza + `noPizzaAdjacent: true` → violation reported at the teleporter cell.
- Same grid + `noPizzaAdjacent: false` → no violation.
- Grid with two teleporters at Chebyshev-1 + `minDistance: 2` → both teleporter cells flagged.
- Toggling settings re-runs validation (covered by the hook test).

### engine/generator.test.ts

- `generate(size, players, { noPizzaAdjacent: true, pizzaAdjacencyMetric: 'chebyshev', minDistance: null })` → resulting grid has no teleporter adjacent to any pizza.
- `generate(..., { minDistance: 3, ... })` → all teleporter pairs are ≥3 Chebyshev apart.
- `generate(..., defaultSettings)` → respects the adjacency default.
- `generate(..., { noPizzaAdjacent: false, minDistance: null })` → produces a valid grid (no constraint beyond existing rules).

### hooks/useGrid.test.ts

- `useGrid` accepts `portalSettings`; changing them re-validates (render with adjacent teleporter+pizza, toggle `noPizzaAdjacent` on, assert a violation appears).
- `generate` passes settings to the engine (assert output respects `minDistance`).

### components/Controls.test.tsx

- Renders the adjacency checkbox + metric select when checked.
- Renders the min-distance checkbox + threshold select when checked.
- Toggling adjacency checkbox calls `onPortalSettingsChange` with the flipped `noPizzaAdjacent`.
- Changing metric select calls `onPortalSettingsChange` with the new metric (only when adjacency enabled).
- Enabling min distance defaults threshold to 2; changing threshold calls `onPortalSettingsChange` with the new value.
- Disabling min distance sets `minDistance: null`.

### App.test.tsx

- Default settings render with the adjacency checkbox checked.