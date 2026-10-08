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