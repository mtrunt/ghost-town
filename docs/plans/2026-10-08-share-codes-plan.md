# Shareable Board Codes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make board generation deterministic via a seeded PRNG and encode all generation parameters + seed into a 6-character base62 string that can be displayed after generation and used to reconstruct the exact same board.

**Architecture:** Mulberry32 PRNG replaces `Math.random()` in the generator's `shuffle()` when a seed is provided. `generate()` returns `{ grid, seed }` instead of `Grid | null`. A new `share-code.ts` module packs 35 bits (size + players + portal settings + seed) into 6 base62 characters. `useGrid` gains `shareCode` state and a `load(code)` function. App displays the code and provides a load input.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Mulberry32 PRNG

**Files:**
- Create: `src/engine/prng.ts`
- Test: `src/engine/prng.test.ts`

**Step 1: Write the failing test**

Create `src/engine/prng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng';

describe('mulberry32', () => {
  it('produces deterministic sequence for same seed', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(54321);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('works with seed 0', () => {
    const rng = mulberry32(0);
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });

  it('works with max 23-bit seed', () => {
    const rng = mulberry32(0x7fffff);
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/prng.test.ts`
Expected: FAIL — module `./prng` not found

**Step 3: Write minimal implementation**

Create `src/engine/prng.ts`:

```ts
/** Mulberry32 — fast, well-tested seeded PRNG.
 *  Returns a function producing floats in [0, 1),
 *  drop-in compatible with Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/prng.test.ts`
Expected: PASS — all 5 tests pass

**Step 5: Commit**

```bash
git add src/engine/prng.ts src/engine/prng.test.ts
git commit -m "feat: add mulberry32 seeded PRNG"
```

---

### Task 2: Share Code Encode/Decode

**Files:**
- Create: `src/engine/share-code.ts`
- Test: `src/engine/share-code.test.ts`

**Step 1: Write the failing test**

Create `src/engine/share-code.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encodeShareCode, decodeShareCode } from './share-code';
import type { PortalSettings } from '../types';
import { GLOBAL_RULES } from '../config/rules';

const FULL_SETTINGS: PortalSettings = {
  noPizzaAdjacent: true,
  pizzaAdjacencyMetric: 'chebyshev',
  noMailboxAdjacent: true,
  minDistance: 3,
  mailboxMinDistance: true,
};

const RELAXED_SETTINGS: PortalSettings = {
  noPizzaAdjacent: false,
  pizzaAdjacencyMetric: 'manhattan',
  noMailboxAdjacent: false,
  minDistance: null,
  mailboxMinDistance: false,
};

describe('encodeShareCode', () => {
  it('produces exactly 6 base62 characters', () => {
    const code = encodeShareCode({ size: 7, players: 2, portalSettings: FULL_SETTINGS, seed: 12345 });
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[0-9a-zA-Z]{6}$/);
  });

  it('produces 6 chars for edge-case seed 0', () => {
    const code = encodeShareCode({ size: 5, players: 2, portalSettings: RELAXED_SETTINGS, seed: 0 });
    expect(code).toHaveLength(6);
  });

  it('produces 6 chars for max 23-bit seed', () => {
    const code = encodeShareCode({ size: 10, players: 4, portalSettings: FULL_SETTINGS, seed: 0x7fffff });
    expect(code).toHaveLength(6);
  });
});

describe('decodeShareCode', () => {
  it('round-trips all params with full settings', () => {
    const params = { size: 7, players: 3, portalSettings: FULL_SETTINGS, seed: 999999 };
    const decoded = decodeShareCode(encodeShareCode(params));
    expect(decoded).toEqual(params);
  });

  it('round-trips with relaxed settings and null minDistance', () => {
    const params = { size: 8, players: 2, portalSettings: RELAXED_SETTINGS, seed: 42 };
    const decoded = decodeShareCode(encodeShareCode(params));
    expect(decoded).toEqual(params);
  });

  it('round-trips minDistance null vs 1-7', () => {
    for (const minDistance of [null, 1, 2, 3, 4, 5, 6, 7] as const) {
      const settings = { ...FULL_SETTINGS, minDistance };
      const params = { size: 7, players: 2, portalSettings: settings, seed: 100 };
      const decoded = decodeShareCode(encodeShareCode(params));
      expect(decoded.portalSettings.minDistance).toBe(minDistance);
    }
  });

  it('round-trips all sizes 5-10', () => {
    for (let size = 5; size <= 10; size++) {
      const params = { size, players: 2, portalSettings: FULL_SETTINGS, seed: 1 };
      const decoded = decodeShareCode(encodeShareCode(params));
      expect(decoded.size).toBe(size);
    }
  });

  it('round-trips all player counts 2-4', () => {
    for (let players = 2; players <= 4; players++) {
      const params = { size: 7, players, portalSettings: FULL_SETTINGS, seed: 1 };
      const decoded = decodeShareCode(encodeShareCode(params));
      expect(decoded.players).toBe(players);
    }
  });

  it('round-trips manhattan metric', () => {
    const settings = { ...FULL_SETTINGS, pizzaAdjacencyMetric: 'manhattan' as const };
    const params = { size: 7, players: 2, portalSettings: settings, seed: 1 };
    const decoded = decodeShareCode(encodeShareCode(params));
    expect(decoded.portalSettings.pizzaAdjacencyMetric).toBe('manhattan');
  });

  it('round-trips default global rules settings', () => {
    const params = { size: 7, players: 2, portalSettings: GLOBAL_RULES.portalSettings, seed: 42 };
    const decoded = decodeShareCode(encodeShareCode(params));
    expect(decoded).toEqual(params);
  });

  it('rejects wrong length code', () => {
    expect(() => decodeShareCode('abc')).toThrow();
    expect(() => decodeShareCode('abcdefg')).toThrow();
  });

  it('rejects invalid base62 characters', () => {
    expect(() => decodeShareCode('ab!def')).toThrow();
    expect(() => decodeShareCode('ab def')).toThrow();
  });

  it('rejects out-of-range size', () => {
    // Manually craft a code with sizeIdx = 6 (size=11, out of range)
    // sizeIdx=6 << 32 + 0 + seed=0
    // value = 6 * 4294967296 = 25769803776
    // We need to encode this as base62
    const code = encodeBase62Raw(6 * 4294967296);
    expect(() => decodeShareCode(code)).toThrow();
  });

  it('rejects out-of-range players', () => {
    // playersIdx=3 (players=5, out of range)
    // value = 3 * 1073741824 = 3221225472
    const code = encodeBase62Raw(3 * 1073741824);
    expect(() => decodeShareCode(code)).toThrow();
  });
});

// Helper to create raw base62 for testing invalid values
function encodeBase62Raw(value: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let v = value;
  do {
    result = chars[v % 62] + result;
    v = Math.floor(v / 62);
  } while (v > 0);
  return result.padStart(6, '0');
}
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/share-code.test.ts`
Expected: FAIL — module `./share-code` not found

**Step 3: Write minimal implementation**

Create `src/engine/share-code.ts`:

```ts
import type { PortalSettings } from '../types';

export interface ShareParams {
  size: number;
  players: number;
  portalSettings: PortalSettings;
  seed: number;
}

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(value: number): string {
  let result = '';
  let v = value;
  do {
    result = BASE62_CHARS[v % 62] + result;
    v = Math.floor(v / 62);
  } while (v > 0);
  return result;
}

function fromBase62(str: string): number {
  let result = 0;
  for (const char of str) {
    const idx = BASE62_CHARS.indexOf(char);
    if (idx === -1) throw new Error(`Invalid character in code: '${char}'`);
    result = result * 62 + idx;
  }
  return result;
}

/** Bit layout (35 bits, MSB-first):
 *  size:3 | players:2 | noPizzaAdjacent:1 | metric:1 | noMailboxAdjacent:1 | minDistance:3 | mailboxMinDistance:1 | seed:23
 *  Uses multiplication instead of bitwise shifts because JS bitwise ops
 *  truncate to 32-bit signed integers, and 35 bits exceeds that. */
export function encodeShareCode(params: ShareParams): string {
  const sizeIdx = params.size - 5;
  const playersIdx = params.players - 2;
  const metricBit = params.portalSettings.pizzaAdjacencyMetric === 'manhattan' ? 1 : 0;
  const minDistEncoded = params.portalSettings.minDistance ?? 0;
  const mailboxMinDist = params.portalSettings.mailboxMinDistance ? 1 : 0;

  const value =
    sizeIdx * 4294967296 +          // << 32
    playersIdx * 1073741824 +       // << 30
    (params.portalSettings.noPizzaAdjacent ? 1 : 0) * 536870912 +  // << 29
    metricBit * 268435456 +         // << 28
    (params.portalSettings.noMailboxAdjacent ? 1 : 0) * 134217728 + // << 27
    minDistEncoded * 16777216 +     // << 24
    mailboxMinDist * 8388608 +      // << 23
    params.seed;

  return toBase62(value).padStart(6, '0');
}

export function decodeShareCode(code: string): ShareParams {
  if (code.length !== 6) throw new Error('Code must be exactly 6 characters');
  const value = fromBase62(code);

  const seed = value % 8388608;
  let rest = Math.floor(value / 8388608);

  const mailboxMinDistance = (rest % 2) === 1;
  rest = Math.floor(rest / 2);

  const minDistEncoded = rest % 8;
  rest = Math.floor(rest / 8);

  const noMailboxAdjacent = (rest % 2) === 1;
  rest = Math.floor(rest / 2);

  const metricBit = rest % 2;
  rest = Math.floor(rest / 2);

  const noPizzaAdjacent = (rest % 2) === 1;
  rest = Math.floor(rest / 2);

  const playersIdx = rest % 4;
  rest = Math.floor(rest / 4);

  const sizeIdx = rest;

  if (sizeIdx > 5) throw new Error('Invalid size in code');
  if (playersIdx > 2) throw new Error('Invalid player count in code');

  const portalSettings: PortalSettings = {
    noPizzaAdjacent,
    pizzaAdjacencyMetric: metricBit === 1 ? 'manhattan' : 'chebyshev',
    noMailboxAdjacent,
    minDistance: minDistEncoded === 0 ? null : minDistEncoded,
    mailboxMinDistance,
  };

  return {
    size: sizeIdx + 5,
    players: playersIdx + 2,
    portalSettings,
    seed,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/share-code.test.ts`
Expected: PASS — all tests pass

**Step 5: Commit**

```bash
git add src/engine/share-code.ts src/engine/share-code.test.ts
git commit -m "feat: add base62 share code encode/decode"
```

---

### Task 3: Make Generator Deterministic with Seed

**Files:**
- Modify: `src/engine/generator.ts`
- Modify: `src/engine/generator.test.ts`

**Step 1: Write the failing tests**

Add a new describe block at the end of `src/engine/generator.test.ts`:

```ts
describe('generator with seed (deterministic)', () => {
  it('same seed produces identical grid', () => {
    const { grid: g1 } = generate(7, 2, GLOBAL_RULES.portalSettings, 12345);
    const { grid: g2 } = generate(7, 2, GLOBAL_RULES.portalSettings, 12345);
    expect(g1).toEqual(g2);
  });

  it('different seeds produce different grids', () => {
    const { grid: g1 } = generate(7, 2, GLOBAL_RULES.portalSettings, 12345);
    const { grid: g2 } = generate(7, 2, GLOBAL_RULES.portalSettings, 54321);
    expect(g1).not.toEqual(g2);
  });

  it('returns the provided seed', () => {
    const { seed } = generate(7, 2, GLOBAL_RULES.portalSettings, 42);
    expect(seed).toBe(42);
  });

  it('returns a random seed when none provided', () => {
    const { seed } = generate(7, 2, GLOBAL_RULES.portalSettings);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0x7fffff);
  });

  it('seeded generated grid is valid', () => {
    const { grid } = generate(7, 2, GLOBAL_RULES.portalSettings, 12345);
    expect(grid).not.toBeNull();
    expect(validate(grid!, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  it('seeded generation with impossible config returns null grid but valid seed', () => {
    const { grid, seed } = generate(5, 4, GLOBAL_RULES.portalSettings, 999);
    expect(grid).toBeNull();
    expect(seed).toBe(999);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/generator.test.ts`
Expected: FAIL — the new tests fail because `generate` returns `Grid | null` not `{ grid, seed }`, and the `seed` parameter isn't accepted.

**Step 3: Update the generator implementation**

Modify `src/engine/generator.ts`:

1. Add import for mulberry32 at the top:

```ts
import { mulberry32 } from './prng';
```

2. Change `shuffle` to accept optional `rng`:

Replace the existing `shuffle` function (lines 11-18) with:

```ts
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

3. Add `rng` parameter to `backtrack` and pass to `shuffle`:

Change the `backtrack` function signature to add `rng: () => number` after `settings`:

```ts
function backtrack(
  grid: Grid,
  units: PlacementUnit[],
  idx: number,
  fencePlaced: number,
  totalFences: number,
  budget: { left: number },
  settings: PortalSettings,
  rng: () => number,
): Grid | null {
```

Change the `shuffle(cells)` call inside `backtrack` (line 71) to `shuffle(cells, rng)`.

Change the recursive `backtrack(...)` call (lines 103-111) to add `rng` as the last argument:

```ts
    const result = backtrack(
      next,
      units,
      idx + 1,
      unit.type === 'fence' ? fencePlaced + 1 : fencePlaced,
      totalFences,
      budget,
      settings,
      rng,
    );
```

4. Change `generate` return type and add seed parameter:

Replace the entire `generate` function (lines 118-138) with:

```ts
export function generate(
  size: number,
  players: number,
  settings: PortalSettings = GLOBAL_RULES.portalSettings,
  seed?: number,
): { grid: Grid | null; seed: number } {
  const actualSeed = seed ?? Math.floor(Math.random() * 0x800000);
  const rng = mulberry32(actualSeed);
  const units = buildPlacementOrder(players);
  const totalFences = TILE_RULES.fence.count(players);
  const RESTARTS = 40;
  for (let i = 0; i < RESTARTS; i++) {
    const budget = { left: MAX_ATTEMPTS };
    const result = backtrack(createEmptyGrid(size), units, 0, 0, totalFences, budget, settings, rng);
    if (result) return { grid: result, seed: actualSeed };
  }
  return { grid: null, seed: actualSeed };
}
```

**Step 4: Update existing generator tests for new return type**

All existing tests in `src/engine/generator.test.ts` call `generate(...)` and expect `Grid | null`. Update them to destructure `{ grid }` from the return value.

In the first `describe('generator', ...)` block, update each test:

- `returns null for impossible tiny grid`:
  ```ts
  const { grid } = generate(5, 4, GLOBAL_RULES.portalSettings);
  expect(grid).toBeNull();
  ```
- `generates a valid 7x7 setup for 2 players`:
  ```ts
  const { grid: g } = generate(7, 2, GLOBAL_RULES.portalSettings);
  expect(g).not.toBeNull();
  expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  ```
- `generates a valid 7x7 setup for 3 players`:
  ```ts
  const { grid: g } = generate(7, 3, GLOBAL_RULES.portalSettings);
  expect(g).not.toBeNull();
  expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  ```
- `generates a valid 8x8 setup for 4 players`:
  ```ts
  const { grid: g } = generate(8, 4, GLOBAL_RULES.portalSettings);
  expect(g).not.toBeNull();
  expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  ```
- `generates a valid 7x7 setup for 4 players without hanging`:
  ```ts
  const { grid: g } = generate(7, 4, GLOBAL_RULES.portalSettings);
  expect(g).not.toBeNull();
  expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  ```
- `respects tile counts`:
  ```ts
  const { grid: g } = generate(7, 2, GLOBAL_RULES.portalSettings)!;
  ```
  → Change to:
  ```ts
  const { grid } = generate(7, 2, GLOBAL_RULES.portalSettings);
  const g = grid!;
  ```
- `pizza/mailbox variants match assignment`:
  ```ts
  const { grid } = generate(7, 3, GLOBAL_RULES.portalSettings);
  const g = grid!;
  ```

In the `describe('generator with portal settings', ...)` block, update each test:

- `generated board has no teleporter adjacent to pizza under default settings`:
  ```ts
  const { grid: g } = generate(7, 2, GLOBAL_RULES.portalSettings);
  expect(g).not.toBeNull();
  expect(validate(g, GLOBAL_RULES.portalSettings)).toEqual([]);
  ```
- `generated board respects minDistance 3`:
  ```ts
  const { grid: g } = generate(7, 2, settings);
  expect(g).not.toBeNull();
  expect(validate(g, settings)).toEqual([]);
  ```
- `generated board under relaxed settings is valid`:
  ```ts
  const { grid: g } = generate(7, 2, settings);
  expect(g).not.toBeNull();
  expect(validate(g, settings)).toEqual([]);
  ```
- `generated board has no teleporter adjacent to mailbox under noMailboxAdjacent`:
  ```ts
  const { grid: g } = generate(7, 2, settings);
  expect(g).not.toBeNull();
  expect(validate(g, settings)).toEqual([]);
  ```
- `generated board respects mailboxMinDistance from same-variant pizza`:
  ```ts
  const { grid: g } = generate(7, 2, settings);
  expect(g).not.toBeNull();
  expect(validate(g, settings)).toEqual([]);
  ```

**Step 5: Run all generator tests**

Run: `npx vitest run src/engine/generator.test.ts`
Expected: PASS — all existing and new tests pass

**Step 6: Commit**

```bash
git add src/engine/generator.ts src/engine/generator.test.ts
git commit -m "feat: make generator deterministic with optional seed"
```

---

### Task 4: Add shareCode State and load Function to useGrid

**Files:**
- Modify: `src/hooks/useGrid.ts`
- Modify: `src/hooks/useGrid.test.ts`

**Step 1: Write the failing tests**

Add new imports at the top of `src/hooks/useGrid.test.ts`:

```ts
import { encodeShareCode, decodeShareCode } from '../engine/share-code';
```

Add these new describe blocks at the end of the file:

```ts
describe('useGrid share code', () => {
  it('generate sets shareCode', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.generate(2));
    expect(result.current.shareCode).not.toBeNull();
    expect(result.current.shareCode).toHaveLength(6);
  });

  it('place clears shareCode', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.generate(2));
    expect(result.current.shareCode).not.toBeNull();
    act(() => result.current.place(0, 0, { type: 'grave' }));
    expect(result.current.shareCode).toBeNull();
  });

  it('remove clears shareCode', () => {
    const { result } = renderHook(() => useGrid());
    act(() => {
      result.current.generate(2);
      result.current.place(0, 0, { type: 'grave' });
    });
    expect(result.current.shareCode).not.toBeNull();
    act(() => result.current.remove(0, 0));
    expect(result.current.shareCode).toBeNull();
  });

  it('clear clears shareCode', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.generate(2));
    expect(result.current.shareCode).not.toBeNull();
    act(() => result.current.clear());
    expect(result.current.shareCode).toBeNull();
  });

  it('resize clears shareCode', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.generate(2));
    expect(result.current.shareCode).not.toBeNull();
    act(() => result.current.resize(9));
    expect(result.current.shareCode).toBeNull();
  });

  it('load with valid code updates grid and calls onLoadSettings', () => {
    const onLoadSettings = vi.fn();
    const { result } = renderHook(() => useGrid(GLOBAL_RULES.portalSettings, onLoadSettings));
    // First generate to get a valid code
    act(() => result.current.generate(2));
    const code = result.current.shareCode!;
    // Clear and load
    act(() => result.current.clear());
    expect(result.current.shareCode).toBeNull();
    act(() => result.current.load(code));
    expect(result.current.shareCode).toBe(code);
    expect(result.current.grid.flat().filter(Boolean).length).toBeGreaterThan(0);
    expect(onLoadSettings).toHaveBeenCalledWith(
      expect.objectContaining({ players: 2 }),
    );
  });

  it('load with invalid code sets error and does not change grid', () => {
    const { result } = renderHook(() => useGrid());
    const gridBefore = result.current.grid;
    act(() => result.current.load('!!!'));
    expect(result.current.error).toMatch(/invalid board code/i);
    expect(result.current.grid).toBe(gridBefore);
    expect(result.current.shareCode).toBeNull();
  });

  it('load with wrong-length code sets error', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.load('abc'));
    expect(result.current.error).toMatch(/invalid board code/i);
  });
});
```

Also add `vi` to the vitest import at the top:

```ts
import { describe, expect, it, vi } from 'vitest';
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useGrid.test.ts`
Expected: FAIL — `shareCode` and `load` don't exist on the hook's return value

**Step 3: Update useGrid implementation**

Modify `src/hooks/useGrid.ts`:

1. Add imports at the top:

```ts
import { encodeShareCode, decodeShareCode } from '../engine/share-code';
```

2. Add `onLoadSettings` parameter and `shareCode` state:

Change the hook signature and add state:

```ts
export function useGrid(
  portalSettings: PortalSettings = GLOBAL_RULES.portalSettings,
  onLoadSettings?: (params: { players: number; portalSettings: PortalSettings }) => void,
) {
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(DEFAULT_SIZE));
  const [error, setError] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
```

3. Clear `shareCode` in `place`, `remove`, `clear`, `resize`:

Add `setShareCode(null);` alongside `setError(null);` in each:

```ts
  const place = useCallback((r: number, c: number, active: ActiveTile) => {
    setError(null);
    setShareCode(null);
    setGrid((g) => {
      if (g[r][c] !== null) return g;
      const next = cloneGrid(g);
      next[r][c] = { tile: active.type, variant: active.variant };
      return next;
    });
  }, []);

  const remove = useCallback((r: number, c: number) => {
    setError(null);
    setShareCode(null);
    setGrid((g) => {
      if (g[r][c] === null) return g;
      const next = cloneGrid(g);
      next[r][c] = null;
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setShareCode(null);
    setGrid((g) => createEmptyGrid(g.length));
  }, []);

  const resize = useCallback((size: number) => {
    setError(null);
    setShareCode(null);
    setGrid(createEmptyGrid(size));
  }, []);
```

4. Update `generate` to encode share code:

```ts
  const generate = useCallback((players: number) => {
    setError(null);
    setGrid((g) => {
      const { grid: result, seed } = generateGrid(g.length, players, portalSettings);
      if (!result) {
        setError('No valid setup found for these settings.');
        setShareCode(null);
        return g;
      }
      setShareCode(encodeShareCode({ size: g.length, players, portalSettings, seed }));
      return result;
    });
  }, [portalSettings]);
```

5. Add `load` function:

```ts
  const load = useCallback((code: string) => {
    setError(null);
    try {
      const params = decodeShareCode(code);
      const { grid: result } = generateGrid(params.size, params.players, params.portalSettings, params.seed);
      if (!result) {
        setError('Could not reconstruct board.');
        return;
      }
      onLoadSettings?.({ players: params.players, portalSettings: params.portalSettings });
      setGrid(result);
      setShareCode(encodeShareCode(params));
    } catch {
      setError('Invalid board code.');
    }
  }, [onLoadSettings]);
```

6. Update the return statement:

```ts
  return { grid, violations, error, shareCode, place, remove, clear, resize, generate, load };
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useGrid.test.ts`
Expected: PASS — all tests pass

**Step 5: Commit**

```bash
git add src/hooks/useGrid.ts src/hooks/useGrid.test.ts
git commit -m "feat: add shareCode state and load function to useGrid"
```

---

### Task 5: Add Share Code Display and Load Input to App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/App.test.tsx`

**Step 1: Write the failing tests**

Add these tests to `src/App.test.tsx`:

```ts
  it('displays share code after generating', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const codeDisplay = screen.getByLabelText(/board code/i);
    expect(codeDisplay).toBeInTheDocument();
    expect(codeDisplay.textContent).toMatch(/^[0-9a-zA-Z]{6}$/);
  });

  it('does not display share code before generating', () => {
    render(<App />);
    expect(screen.queryByLabelText(/board code/i)).not.toBeInTheDocument();
  });

  it('renders load input and load button', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
  });

  it('loading a valid code reconstructs the board', () => {
    render(<App />);
    // Generate to get a code
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const codeDisplay = screen.getByLabelText(/board code/i) as HTMLInputElement;
    const code = codeDisplay.value || codeDisplay.textContent!;
    // Clear the board
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.queryByLabelText(/board code/i)).not.toBeInTheDocument();
    // Load the code
    const loadInput = screen.getByPlaceholderText(/code/i);
    fireEvent.change(loadInput, { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: /load/i }));
    // Board should be filled again
    const cells = screen.getAllByRole('gridcell');
    const filled = cells.filter((c) => c.textContent && c.textContent.trim() !== '');
    expect(filled.length).toBeGreaterThan(0);
    // Share code should be displayed again
    expect(screen.getByLabelText(/board code/i)).toBeInTheDocument();
  });

  it('loading an invalid code shows an error', () => {
    render(<App />);
    const loadInput = screen.getByPlaceholderText(/code/i);
    fireEvent.change(loadInput, { target: { value: '!!!' } });
    fireEvent.click(screen.getByRole('button', { name: /load/i }));
    expect(screen.getByText(/invalid board code/i)).toBeInTheDocument();
  });
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — no share code display or load input exists yet

**Step 3: Update App.tsx**

Modify `src/App.tsx`:

1. Add `useCallback` to the React import:

```ts
import { useCallback, useState } from 'react';
```

2. Add `onLoadSettings` callback and `loadCode` state, destructure `shareCode` and `load` from `useGrid`:

```ts
export default function App() {
  const [players, setPlayers] = useState(2);
  const [active, setActive] = useState<ActiveTile | null>(null);
  const [portalSettings, setPortalSettings] = useState(GLOBAL_RULES.portalSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadCode, setLoadCode] = useState('');
  const onLoadSettings = useCallback(({ players, portalSettings }: { players: number; portalSettings: typeof GLOBAL_RULES.portalSettings }) => {
    setPlayers(players);
    setPortalSettings(portalSettings);
  }, []);
  const { grid, violations, error, shareCode, place, remove, clear, resize, generate, load } = useGrid(portalSettings, onLoadSettings);
```

3. Add load handler:

```ts
  const handleLoad = () => {
    load(loadCode.trim());
    setLoadCode('');
  };
```

4. Add the share code display and load input in the header. Insert after the `app-header-row` div and before the settings panel, inside `<header>`:

```tsx
        {shareCode && (
          <div className="share-code-row">
            <label htmlFor="share-code">Board code:</label>
            <input
              id="share-code"
              aria-label="board code"
              className="share-code-display"
              type="text"
              value={shareCode}
              readOnly
            />
          </div>
        )}
        <div className="load-row">
          <input
            type="text"
            placeholder="code"
            maxLength={6}
            value={loadCode}
            onChange={(e) => setLoadCode(e.target.value)}
            className="load-input"
          />
          <button type="button" className="action-btn secondary" onClick={handleLoad}>Load</button>
        </div>
```

The full updated `<header>` section should look like:

```tsx
      <header className="app-header">
        <div className="app-header-row">
          <h1>Ghost Town Setup</h1>
          <div className="app-header-actions">
            <button type="button" className="action-btn" onClick={() => generate(players)}>Generate</button>
            <button type="button" className="action-btn secondary" onClick={clear}>Clear</button>
            <button type="button" className="controls-toggle" aria-label="toggle settings" onClick={() => setSettingsOpen((v) => !v)}>
              {settingsOpen ? '✕' : '⚙'}
            </button>
          </div>
        </div>
        <div className="load-row">
          <input
            type="text"
            placeholder="code"
            maxLength={6}
            value={loadCode}
            onChange={(e) => setLoadCode(e.target.value)}
            className="load-input"
          />
          <button type="button" className="action-btn secondary" onClick={handleLoad}>Load</button>
        </div>
        {shareCode && (
          <div className="share-code-row">
            <label htmlFor="share-code">Board code:</label>
            <input
              id="share-code"
              aria-label="board code"
              className="share-code-display"
              type="text"
              value={shareCode}
              readOnly
            />
          </div>
        )}
        {settingsOpen && (
          <Controls
            players={players}
            size={grid.length}
            portalSettings={portalSettings}
            onPlayersChange={setPlayers}
            onSizeChange={handleSizeChange}
            onPortalSettingsChange={setPortalSettings}
          />
        )}
      </header>
```

**Step 4: Add CSS for share code display and load input**

Add to `src/App.css`, after the `.controls-toggle:active` rule (around line 89):

```css
/* Load row + share code display */
.load-row {
  display: flex;
  gap: 0.4rem;
  padding: 0 0.75rem 0.5rem;
  align-items: center;
}
.load-input {
  flex: 0 0 auto;
  width: 6rem;
  padding: 0.5rem;
  background: #0f172a;
  color: #f1f5f9;
  border: 1px solid #334155;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.05em;
  min-height: 2.25rem;
}
.share-code-row {
  display: flex;
  gap: 0.4rem;
  padding: 0 0.75rem 0.5rem;
  align-items: center;
}
.share-code-row label {
  font-size: 0.75rem;
  color: #cbd5e1;
  white-space: nowrap;
}
.share-code-display {
  flex: 0 0 auto;
  width: 6rem;
  padding: 0.4rem 0.5rem;
  background: #0f172a;
  color: #38bdf8;
  border: 1px solid #334155;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.08em;
  text-align: center;
  min-height: 2.25rem;
}
```

Also add responsive styles for tablet/desktop inside the `@media (min-width: 720px)` block:

```css
  .load-row {
    display: inline-flex;
    padding: 0;
  }
  .share-code-row {
    display: inline-flex;
    padding: 0;
  }
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS — all tests pass

**Step 6: Commit**

```bash
git add src/App.tsx src/App.css src/App.test.tsx
git commit -m "feat: display share code and add load input to App"
```

---

### Task 6: Run Full Test Suite and Lint

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass across all test files.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

**Step 3: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: No type errors.

If any issues are found, fix them and re-run until clean.

**Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve lint/typecheck issues from share code feature"
```

If no fixes were needed, skip this step.