import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrid } from './useGrid';
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

describe('useGrid', () => {
  it('starts with default 7x7 empty grid', () => {
    const { result } = renderHook(() => useGrid());
    expect(result.current.grid).toHaveLength(7);
    expect(result.current.grid[0]).toHaveLength(7);
  });

  it('place adds a tile', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.place(3, 3, { type: 'grave' }));
    expect(result.current.grid[3][3]).toEqual({ tile: 'grave' });
  });

  it('place with variant stores variant', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.place(3, 3, { type: 'pizza', variant: 'pepper' }));
    expect(result.current.grid[3][3]).toEqual({ tile: 'pizza', variant: 'pepper' });
  });

  it('remove clears a cell', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.place(3, 3, { type: 'grave' }));
    act(() => result.current.remove(3, 3));
    expect(result.current.grid[3][3]).toBeNull();
  });

  it('clear empties the grid', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.place(0, 0, { type: 'grave' }));
    act(() => result.current.clear());
    expect(result.current.grid.flat().every((c) => c === null)).toBe(true);
  });

  it('resize changes grid size', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.resize(9));
    expect(result.current.grid).toHaveLength(9);
  });

  it('violations update after place', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.place(0, 0, { type: 'start' })); // edge → violation
    expect(result.current.violations.length).toBeGreaterThan(0);
  });

  it('generate produces a valid grid', () => {
    const { result } = renderHook(() => useGrid());
    act(() => result.current.generate(2));
    expect(result.current.grid.flat().filter(Boolean).length).toBeGreaterThan(0);
    expect(result.current.violations).toEqual([]);
  });

  it('generate returns error message when impossible', () => {
    const { result } = renderHook(() => useGrid());
    act(() => {
      result.current.resize(5);
      result.current.generate(4);
    });
    expect(result.current.error).toMatch(/no valid setup/i);
  });
});