# Shareable Board Codes — Design

## Overview

Add a shareable alphanumeric code (6 characters, case-sensitive) that captures the full board generation recipe. After generating a board, the code is displayed in the UI. Entering a code into a load input reconstructs the exact same board by re-running the generator deterministically with the encoded seed and parameters.

## Context

The generator (`src/engine/generator.ts`) currently uses `Math.random()` via `shuffle()` to randomize tile placement during backtracking. This makes every generation non-reproducible. To support share codes, the generator must be made deterministic by replacing `Math.random()` with a seeded PRNG (Mulberry32). The code encodes all generation parameters plus the seed so loading always reproduces the exact board regardless of current UI state.

## Approach

**Chosen: Seed-based encoding with seeded PRNG.** The generator is modified to accept an optional `seed` parameter. When provided, a Mulberry32 PRNG replaces `Math.random()` in `shuffle()`, making the entire backtracking sequence deterministic. After generation, the seed (randomly chosen if not supplied) is returned to the caller and encoded into a 6-character base62 string alongside the other generation parameters.

Rejected alternatives:
- *Full board state encoding* — would exceed 6 chars for larger grids; couples the code format to grid representation.
- *npm PRNG library* — unnecessary dependency for a simple, well-understood algorithm.

## Bit Layout (35 bits → 6 base62 chars)

Base62 (0-9, a-z, A-Z) provides ~35.7 bits in 6 characters. The 35-bit payload is packed as a single integer and converted to base62, zero-padded to 6 chars.

```
| Field                  | Bits | Range / Encoding                     |
|------------------------|------|--------------------------------------|
| size                   | 3    | 0-5 → size = value + 5 (sizes 5-10)  |
| players                | 2    | 0-2 → players = value + 2 (2-4)      |
| noPizzaAdjacent        | 1    | 0=false, 1=true                      |
| pizzaAdjacencyMetric   | 1    | 0=chebyshev, 1=manhattan             |
| noMailboxAdjacent      | 1    | 0=false, 1=true                      |
| minDistance            | 3    | 0=null, 1-7=value                    |
| mailboxMinDistance     | 1    | 0=false, 1=true                      |
| seed                   | 23   | 0 to 8,388,607                       |
| Total                  | 35   |                                      |
```

The integer is assembled MSB-first: `value = (size << 32) | (players << 30) | (noPizzaAdjacent << 29) | ... | seed`. Encoding converts this integer to base62 and left-pads with `0` to 6 characters. Decoding reverses the process and validates ranges.

### Base62 alphabet

```
0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
```

Indices 0-9 → digits, 10-35 → lowercase, 36-61 → uppercase. Case-sensitive, URL-safe.

## New Modules

### `src/engine/prng.ts`

```ts
/** Mulberry32 — fast, well-tested seeded PRNG. Returns a function
 *  producing floats in [0, 1), drop-in compatible with Math.random. */
export function mulberry32(seed: number): () => number;
```

### `src/engine/share-code.ts`

```ts
export interface ShareParams {
  size: number;
  players: number;
  portalSettings: PortalSettings;
  seed: number;
}

/** Encodes generation params + seed into a 6-char base62 string. */
export function encodeShareCode(params: ShareParams): string;

/** Decodes a 6-char base62 string back into generation params.
 *  Throws on invalid format, length, or out-of-range values. */
export function decodeShareCode(code: string): ShareParams;
```

## Generator Changes (`src/engine/generator.ts`)

- `shuffle()` takes an optional `rng: () => number` parameter (defaults to `Math.random()`).
- `backtrack()` accepts and forwards `rng` to `shuffle()`.
- `generate()` signature changes to accept an optional `seed?: number`:
  ```ts
  export function generate(
    size: number,
    players: number,
    settings?: PortalSettings,
    seed?: number,
  ): { grid: Grid | null; seed: number };
  ```
- When `seed` is provided, a Mulberry32 PRNG is created and threaded through. When omitted, a random 23-bit seed is generated (via `Math.floor(Math.random() * 0x800000)`).
- Returns `{ grid, seed }` so the caller can encode a share code. When `seed` is provided, the same seed is returned (for symmetry).
- The random-restart loop uses the seed to initialize the PRNG once; each restart gets a deterministic PRNG state by continuing the sequence (the PRNG is not re-seeded per restart).

## Hook Changes (`src/hooks/useGrid.ts`)

- New state: `shareCode: string | null` — set after `generate()`, cleared on manual edits (`place`, `remove`, `clear`, `resize`).
- `generate()` now encodes the returned seed + params into a share code and stores it.
- New `load(code: string)` function:
  1. Calls `decodeShareCode(code)` — on error, sets `error` state and returns.
  2. Calls a new `onLoadSettings` callback with decoded `players`, `size`, and `portalSettings` so App can update UI state.
  3. Resizes the grid to the decoded size.
  4. Calls `generateGrid(size, players, portalSettings, seed)` and sets the grid.
  5. Sets `shareCode` to the normalized (re-encoded) code.
- `place`, `remove`, `clear`, `resize` clear `shareCode`.

## UI Changes (`src/App.tsx`)

- After generation, display the share code prominently (read-only text or input with copy-on-click) below the header or near the board.
- Add a text input + "Load" button in the header actions area.
- On load:
  1. Call `useGrid.load(code)`.
  2. The hook calls back with decoded settings; App updates `players`, `portalSettings`, and size state.
- Loading overrides current UI settings to match decoded values. The controls panel updates automatically.

### Layout sketch

```
[Generate] [Clear] [⚙]              [______] [Load]    <- header row
Code: aB3x9Q                                              <- share code display
```

## Error Handling

| Scenario | Behavior |
|---|---|
| Invalid code format (wrong length, non-base62 chars) | `decodeShareCode` throws → `error` state shows "Invalid board code." |
| Valid code but generator returns null | Should not happen (seed was valid when created), but handled: "Could not reconstruct board." |
| Code from a future version with different bit layout | Not handled in v1 (no version bits). Could add a version prefix later by reducing seed bits. |

## Testing

### `src/engine/prng.test.ts`
- Same seed produces identical sequence of floats.
- Different seeds produce different sequences.
- Output is in `[0, 1)`.

### `src/engine/share-code.test.ts`
- Encode/decode round-trip for all combinations of: size (5-10), players (2-4), all portal settings on/off, minDistance (null, 1-7), various seeds.
- Encode produces exactly 6 base62 chars.
- Decode rejects: wrong length, invalid characters, out-of-range fields.
- Edge cases: seed=0, seed=max (8388607), all settings off, all settings on.

### `src/engine/generator.test.ts`
- Same seed + same params → identical grid (run twice, assert deep equal).
- Different seeds → different grids (high probability, assert not equal).
- Seed provided vs random: both return `{ grid, seed }`.

### `src/hooks/useGrid.test.ts`
- `generate()` sets `shareCode`.
- `place()`, `remove()`, `clear()`, `resize()` clear `shareCode`.
- `load(validCode)` updates grid and calls `onLoadSettings` with decoded params.
- `load(invalidCode)` sets error, does not change grid.
- `load(validCode)` sets `shareCode` to the normalized code.

### `src/App.test.tsx`
- After generate, share code is displayed.
- Load input + button render.
- Entering a valid code and clicking Load updates the board and UI settings.
- Entering an invalid code shows an error.