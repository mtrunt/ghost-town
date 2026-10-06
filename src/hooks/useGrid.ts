import { useCallback, useMemo, useState } from 'react';
import type { ActiveTile, Grid } from '../types';
import { createEmptyGrid, cloneGrid } from '../engine/grid-helpers';
import { validate } from '../engine/validator';
import { generate as generateGrid } from '../engine/generator';

const DEFAULT_SIZE = 7;

export function useGrid() {
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
      const result = generateGrid(g.length, players);
      if (!result) {
        setError('No valid setup found for these settings.');
        return g;
      }
      return result;
    });
  }, []);

  const violations = useMemo(() => validate(grid), [grid]);

  return { grid, violations, error, place, remove, clear, resize, generate };
}