import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrid } from './useGrid';

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