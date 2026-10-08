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