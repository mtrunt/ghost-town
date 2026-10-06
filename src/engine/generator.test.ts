import { describe, expect, it } from 'vitest';
import { generate } from './generator';
import { validate } from './validator';
import { getVariantAssignment } from '../config/rules';

describe('generator', () => {
  it('returns null for impossible tiny grid', () => {
    // 4 start tiles each need a 3x3 free zone; on a 5x5 grid this is impossible.
    expect(generate(5, 4)).toBeNull();
  });

  it('generates a valid 7x7 setup for 2 players', () => {
    const g = generate(7, 2);
    expect(g).not.toBeNull();
    expect(validate(g!)).toEqual([]);
  });

  it('generates a valid 7x7 setup for 3 players', () => {
    const g = generate(7, 3);
    expect(g).not.toBeNull();
    expect(validate(g!)).toEqual([]);
  });

  it('generates a valid 8x8 setup for 4 players', () => {
    const g = generate(8, 4);
    expect(g).not.toBeNull();
    expect(validate(g!)).toEqual([]);
  });

  it('respects tile counts', () => {
    const g = generate(7, 2)!;
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
    const g = generate(7, 3)!;
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