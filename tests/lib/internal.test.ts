import { describe, it, expect } from 'vitest';
import { findInternalTransfers, type InternalCandidate } from '@/lib/internal';

const c = (o: Partial<InternalCandidate> & { id: number }): InternalCandidate => ({
  accountKey: 'A', occurredAt: '2026-01-10T12:00:00', amountKop: -10000,
  description: 'x', bankCategory: null, ...o,
});
const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

describe('findInternalTransfers', () => {
  it('pair across accounts within 48h -> both internal', () => {
    const r = findInternalTransfers([
      c({ id: 1, accountKey: 'A', amountKop: -10000 }),
      c({ id: 2, accountKey: 'B', amountKop: 10000, occurredAt: '2026-01-11T12:00:00' }),
    ]);
    expect(sorted(r)).toEqual([1, 2]);
  });
  it('48h bound is inclusive', () => {
    const r = findInternalTransfers([
      c({ id: 1, accountKey: 'A', amountKop: -10000 }),
      c({ id: 2, accountKey: 'B', amountKop: 10000, occurredAt: '2026-01-12T12:00:00' }),
    ]);
    expect(r.size).toBe(2);
  });
  it('same amount on same account -> not internal', () => {
    const r = findInternalTransfers([
      c({ id: 1, amountKop: -10000 }),
      c({ id: 2, amountKop: 10000 }),
    ]);
    expect(r.size).toBe(0);
  });
  it('gap 3 days -> not internal', () => {
    const r = findInternalTransfers([
      c({ id: 1, accountKey: 'A' }),
      c({ id: 2, accountKey: 'B', amountKop: 10000, occurredAt: '2026-01-13T12:00:00' }),
    ]);
    expect(r.size).toBe(0);
  });
  it('one debit, two equal credits -> only the closest in time is paired', () => {
    const r = findInternalTransfers([
      c({ id: 1, accountKey: 'A' }),
      c({ id: 2, accountKey: 'B', amountKop: 10000, occurredAt: '2026-01-11T12:00:00' }),
      c({ id: 3, accountKey: 'C', amountKop: 10000, occurredAt: '2026-01-10T13:00:00' }),
    ]);
    expect(sorted(r)).toEqual([1, 3]);
  });
  it('ties broken by (debit id, credit id)', () => {
    const r = findInternalTransfers([
      c({ id: 5, accountKey: 'A' }),
      c({ id: 9, accountKey: 'B', amountKop: 10000 }),
      c({ id: 7, accountKey: 'C', amountKop: 10000 }),
    ]);
    expect(sorted(r)).toEqual([5, 7]);
  });
  it('Privat marker without counterpart -> internal', () => {
    const r = findInternalTransfers([
      c({ id: 1, amountKop: 5000, bankCategory: 'Зарахування зі своєї картки' }),
    ]);
    expect(r.has(1)).toBe(true);
  });
  it('description marker -> internal', () => {
    const r = findInternalTransfers([
      c({ id: 1, amountKop: -5000, description: 'Переказ на свою картку' }),
    ]);
    expect(r.has(1)).toBe(true);
  });
  it('marker transaction can still pair, making its counterpart internal', () => {
    const r = findInternalTransfers([
      c({ id: 1, accountKey: 'A', amountKop: 10000, bankCategory: 'Зарахування зі своєї картки' }),
      c({ id: 2, accountKey: 'B', amountKop: -10000, occurredAt: '2026-01-10T12:05:00' }),
    ]);
    expect(sorted(r)).toEqual([1, 2]);
  });
  it('lonely outgoing transfer to unknown card -> not internal', () => {
    const r = findInternalTransfers([c({ id: 1, description: 'Переказ на картку 5375****1111' })]);
    expect(r.size).toBe(0);
  });
  it('zero amount never pairs', () => {
    const r = findInternalTransfers([
      c({ id: 1, accountKey: 'A', amountKop: 0 }),
      c({ id: 2, accountKey: 'B', amountKop: 0 }),
    ]);
    expect(r.size).toBe(0);
  });
});
