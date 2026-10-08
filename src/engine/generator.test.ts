import { describe, expect, it } from 'vitest';
import { generate } from './generator';
import { validate } from './validator';
import { getVariantAssignment, GLOBAL_RULES } from '../config/rules';

describe('generator', () => {
  it('returns null for impossible tiny grid', () => {
    // 4 start tiles each need a 3x3 free zone; on a 5x5 grid this is impossible.
    expect(generate(5, 4, GLOBAL_RULES.portalSettings)).toBeNull();
  });

  it('generates a valid 7x7 setup for 2 players', () => {
    const g = generate(7, 2, GLOBAL_RULES.portalSettings);
    expect(g).not.toBeNull();
    expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  it('generates a valid 7x7 setup for 3 players', () => {
    const g = generate(7, 3, GLOBAL_RULES.portalSettings);
    expect(g).not.toBeNull();
    expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  it('generates a valid 8x8 setup for 4 players', () => {
    const g = generate(8, 4, GLOBAL_RULES.portalSettings);
    expect(g).not.toBeNull();
    expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  // Regression: the default board size is 7, and the naive backtracker would
  // hang on 7x7/4p because most random start-tile arrangements are infeasible
  // and the search spent exponential time proving it. The generator must
  // either find a valid board or return null within a reasonable time budget.
  it('generates a valid 7x7 setup for 4 players without hanging', () => {
    const g = generate(7, 4, GLOBAL_RULES.portalSettings);
    expect(g).not.toBeNull();
    expect(validate(g!, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  it('respects tile counts', () => {
    const g = generate(7, 2, GLOBAL_RULES.portalSettings)!;
    const counts: Record<string, number> = {};
    for (const row of g) for (const cell of row) {
      if (cell) counts[cell.tile] = (counts[cell.tile] ?? 0) + 1;
    }
    expect(counts.start).toBe(2);
    expect(counts.pizza).toBe(2);
    expect(counts.mailbox).toBe(2);
    expect(counts.grave).toBe(6);
    expect(counts.fence).toBe(4);
    expect(counts.teleporter).toBe(3);
  });

  it('pizza/mailbox variants match assignment', () => {
    const g = generate(7, 3, GLOBAL_RULES.portalSettings)!;
    const pizzaVariants: string[] = [];
    const mailboxVariants: string[] = [];
    for (const row of g) for (const cell of row) {
      if (cell?.tile === 'pizza') pizzaVariants.push(cell.variant!);
      if (cell?.tile === 'mailbox') mailboxVariants.push(cell.variant!);
    }
    const expected = getVariantAssignment('pizza', 3);
    expect(pizzaVariants.sort()).toEqual([...expected].sort());
    expect(mailboxVariants.sort()).toEqual([...expected].sort());
  });
});

describe('generator with portal settings', () => {
  it('generated board has no teleporter adjacent to pizza under default settings', () => {
    const g = generate(7, 2, GLOBAL_RULES.portalSettings)!;
    expect(g).not.toBeNull();
    expect(validate(g, GLOBAL_RULES.portalSettings)).toEqual([]);
  });

  it('generated board respects minDistance 3', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, noMailboxAdjacent: false, minDistance: 3 };
    const g = generate(7, 2, settings)!;
    expect(g).not.toBeNull();
    expect(validate(g, settings)).toEqual([]);
  });

  it('generated board under relaxed settings is valid', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, noMailboxAdjacent: false, minDistance: null };
    const g = generate(7, 2, settings)!;
    expect(g).not.toBeNull();
    expect(validate(g, settings)).toEqual([]);
  });

  it('generated board has no teleporter adjacent to mailbox under noMailboxAdjacent', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, noMailboxAdjacent: true, minDistance: null };
    const g = generate(7, 2, settings)!;
    expect(g).not.toBeNull();
    expect(validate(g, settings)).toEqual([]);
  });

  it('generated board respects mailboxMinDistance from same-variant pizza', () => {
    const settings = { noPizzaAdjacent: false, pizzaAdjacencyMetric: 'chebyshev' as const, noMailboxAdjacent: false, minDistance: 3, mailboxMinDistance: true };
    const g = generate(7, 2, settings)!;
    expect(g).not.toBeNull();
    expect(validate(g, settings)).toEqual([]);
  });
});