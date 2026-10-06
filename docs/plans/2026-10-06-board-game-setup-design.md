# Ghost Town — Board Game Setup App Design

## Overview

A web app for setting up a themed board game. The user picks a player count and grid size, then either generates a random valid setup or manually places/removes tiles on the grid with live rule enforcement. Rules are config-driven and the grid size is modifiable.

## Tech Stack

- React + Vite + TypeScript
- No UI framework; plain CSS
- No backend; single-page client app

## Architecture

```
ghost-town/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx               # React entry
    ├── App.tsx                # Top-level: holds state, layout
    ├── types.ts               # Tile, Cell, Grid, Placement types
    ├── config/
    │   └── rules.ts           # Config-driven tile definitions + rule predicates
    ├── engine/
    │   ├── validator.ts       # Runs predicates against a grid → list of violations
    │   ├── generator.ts       # Backtracking generator using predicates as pruning
    │   └── connectivity.ts    # Flood-fill accessibility check (fences block)
    ├── components/
    │   ├── Board.tsx          # Renders the N×N grid
    │   ├── Cell.tsx           # Single cell, click-to-place/remove
    │   ├── TilePalette.tsx    # Sidebar: pick tile type to place
    │   ├── Controls.tsx       # Generate, clear, grid size, player count
    │   └── Violations.tsx     # Lists current rule violations
    └── hooks/
        └── useGrid.ts         # Grid state + actions (place, remove, generate, resize)
```

### Data Flow

`useGrid` hook owns grid state. `Controls` triggers `generate(players, size)` or `resize(n)`. `TilePalette` sets the active tile the user is placing. Clicking a `Cell` calls `place(row, col, tile)` or `remove(row, col)`. Every state change runs `validator` → violations feed the `Violations` panel and cell-level error styling (red ring on offending cells).

### State Shape

```ts
type Grid = (Cell | null)[][];                  // null = empty
interface Cell { tile: Tile; variant?: string; }
type Tile = 'start' | 'pizza' | 'mailbox' | 'grave' | 'fence' | 'teleporter';
```

## Tiles

| Tile | Count | Variants | Placement Logic |
|------|-------|----------|-----------------|
| Start | = players (2–4) | — | Not on grid edge; all 8 surrounding cells must be empty |
| Pizza box | = players | pepper, cheese, pepperoni | 2–3 players: all distinct; 4 players: only cheese + pepperoni. General rules. |
| Mailbox | matches pizza (count + types) | same as pizza | Not adjacent (8-dir) to a pizza box of the same variant |
| Grave | 6 (always) | — | General rules only |
| Fence | 4 (always) | — | General rules; grid must remain accessible after placement |
| Teleporter | 3 (always) | square, triangle, circle | General rules only |

### General Rules

- Each cell holds at most 1 tile.
- No area of the grid is inaccessible. Movement is cell-to-cell orthogonal (4-directional); fence cells block passage. Accessibility is verified via flood-fill from any non-fence cell, requiring all non-fence cells to be reachable.
- Each start location has no tiles in the 8 surrounding cells (exclusion radius of 1).

## Rule Config Schema

Each tile type is defined in `config/rules.ts` with metadata + placement predicates.

```ts
interface TileRule {
  type: Tile;
  label: string;
  icon: string;                          // emoji
  color: string;
  variants?: string[];                   // pizza / teleporter
  count: (players: number) => number;
  variantAssignment?: (players: number) => string[];
  canPlace: (grid: Grid, r: number, c: number, variant?: string) => boolean;
}

interface GlobalRules {
  maxSize: number; minSize: number;
  startExclusionRadius: number;          // 1 → 8 surrounding cells empty
  movementDirections: '4' | '8';
  checkAccessibility: (grid: Grid) => boolean;
  oneTilePerCell: boolean;
}
```

### Variant Assignment

- 2 players → `['pepper','cheese']`
- 3 players → `['pepper','cheese','pepperoni']`
- 4 players → `['cheese','pepperoni','cheese','pepperoni']` (only cheese + pepperoni)

Mailboxes receive the same variant assignment as pizza boxes so types and counts always match.

## Engine

### Generator (`generator.ts`)

Backtracking with randomized placement order:

1. Build placement order: start tiles first (most constrained), then pizza, mailboxes, graves, teleporters, fences last.
2. For each slot, shuffle candidate cells and try each against `canPlace`. If it passes, place and recurse.
3. After placing the final fence, run `checkAccessibility` (flood-fill). On failure, backtrack.
4. On candidate exhaustion for a slot, backtrack to the previous slot.
5. Return the first complete valid grid, or `null` if impossible.

Pizza and mailbox variants are pre-assigned by `variantAssignment` before placement, so the generator places e.g. "pizza:pepper" as a discrete unit.

### Validator (`validator.ts`)

Runs on every state change in the editor:

1. For each occupied cell, re-run that tile's `canPlace` against the current grid (treating the cell itself as empty). Collect failures.
2. Run global rules: one-tile-per-cell, accessibility via `checkAccessibility`.
3. Cross-tile rules: mailbox-not-adjacent-to-same-pizza-variant, start exclusion.
4. Return `Violation[]` with `{row, col, message}`. UI lists them and marks offending cells with a red ring.

## Editor Interactions

- Click empty cell with active tile selected → place (immediately validated; if violation, cell shows red ring + message in panel, tile stays so the user can see/fix).
- Click occupied cell → remove.
- "Generate" button → runs generator, replaces grid.
- "Clear" button → empties grid.
- Grid size input (range 5–10, default 7) → rebuilds empty grid (warns if current setup will be lost).
- Player count select (2/3/4) → updates counts; does not auto-regenerate.

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  Ghost Town Setup           [2▼ players] [7×7▼]  │
├──────────┬────────────────────────────────┬──────┤
│ Tile     │                                │ Viol │
│ Palette  │       Board (N×N grid)         │ atns │
│          │                                │      │
│ 🚩 Start │   ┌───┬───┬───┬───┬───┬───┐   │      │
│ 🍕 Pizza │   │   │   │   │   │   │   │   │      │
│ 📬 Mail  │   ├───┼───┼───┼───┼───┼───┤   │      │
│ ⚰️ Grave │   │   ...                   │   │      │
│ 🚧 Fence │   └───┴───┴───┴───┴───┴───┘   │      │
│ 🌀 Tele  │                                │      │
│          │                                │      │
│ [Generate]│                                │      │
│ [Clear]  │                                │      │
└──────────┴────────────────────────────────┴──────┘
```

- **Left — Tile Palette:** vertical list of tile types; click to select as the active placement tile. Tiles with variants (pizza, teleporter) expand to show sub-options. Selected tile highlighted.
- **Center — Board:** CSS grid of `N×N` cells. Each cell is a flex-centered square showing the tile's emoji + variant color background. Square via `aspect-ratio: 1`. Hover shows placement preview (faint emoji). Clicking places/removes. Violating cells get a red ring + tooltip.
- **Right — Violations panel:** live list of rule violations with cell coordinates and message. Empty state: "✓ Setup is valid". Generator-failure state: "No valid setup found for these settings."

### Visual Details

- Background: dark slate (`#1e293b`); board cells light (`#f1f5f9`); empty cells with subtle border.
- Tile colors: start `#22c55e`, pizza `#f97316`, mailbox `#3b82f6`, grave `#6b7280`, fence `#a16207`, teleporter `#a855f7`. Variant distinguished by emoji + slight shade variation.
- Responsive: on narrow screens, palette collapses to a top bar and violations to a bottom drawer.

## Error Handling

- Generator returns `null` → UI shows "No valid setup found for these settings."
- Validator violations render inline on offending cells + in the violations panel.
- Grid resize with existing setup → confirmation prompt before wiping.