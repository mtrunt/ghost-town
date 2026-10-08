import { useCallback, useMemo, useState } from 'react';
import type { ActiveTile, Grid, PortalSettings } from '../types';
import { createEmptyGrid, cloneGrid } from '../engine/grid-helpers';
import { validate } from '../engine/validator';
import { generate as generateGrid } from '../engine/generator';
import { encodeShareCode, decodeShareCode } from '../engine/share-code';
import { GLOBAL_RULES } from '../config/rules';

const DEFAULT_SIZE = 7;

export function useGrid(
  portalSettings: PortalSettings = GLOBAL_RULES.portalSettings,
  onLoadSettings?: (params: { players: number; portalSettings: PortalSettings }) => void,
) {
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(DEFAULT_SIZE));
  const [error, setError] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);

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

  const violations = useMemo(() => validate(grid, portalSettings), [grid, portalSettings]);

  return { grid, violations, error, shareCode, place, remove, clear, resize, generate, load };
}