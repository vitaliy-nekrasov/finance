import { expect, test } from 'vitest';
import { parseTxSort, sortTx } from '@/lib/tx-sort';

const rows = [
  { id: 1, amountKop: -5000 },
  { id: 2, amountKop: 6900 },
  { id: 3, amountKop: -20000 },
];

test('parseTxSort: known values, anything else is date', () => {
  expect(parseTxSort('amount-desc')).toBe('amount-desc');
  expect(parseTxSort('amount-asc')).toBe('amount-asc');
  expect(parseTxSort('date')).toBe('date');
  expect(parseTxSort(undefined)).toBe('date');
  expect(parseTxSort('constructor')).toBe('date');
});

test('sortTx by absolute amount; date keeps input order; input not mutated', () => {
  expect(sortTx(rows, 'amount-desc').map((r) => r.id)).toEqual([3, 2, 1]);
  expect(sortTx(rows, 'amount-asc').map((r) => r.id)).toEqual([1, 2, 3]);
  expect(sortTx(rows, 'date').map((r) => r.id)).toEqual([1, 2, 3]);
  expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
});
