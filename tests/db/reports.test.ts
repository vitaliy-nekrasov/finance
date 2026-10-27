import { beforeEach, expect, test } from 'vitest';
import { createTestDb } from '../helpers/db';
import type { Db } from '@/db/client';
import { ingestStatement } from '@/db/repo';
import { getLatestMonth, getMonthly, getMonthsWithData, getReport, getTransactions } from '@/db/reports';
import { transactions } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { stmt, tx } from './fixtures';

const oct = { from: '2026-10-01', to: '2026-10-31' };
let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

test('report: income, expense, net, byCategory sorted desc; refund +69 in cafe reduces cafe', async () => {
  await ingestStatement(
    db,
    stmt('privat', [
      tx('privat', '2026-10-01T00:00:00', -30000, 'Сільпо', { bankCategory: 'Супермаркети та продукти' }),
      tx('privat', '2026-10-31T23:59:59', -20000, 'Ресторан', { bankCategory: 'Ресторани, кафе, бари' }),
      tx('privat', '2026-10-12T10:00:00', 6900, 'Повернення кафе', { bankCategory: 'Ресторани, кафе, бари' }),
      tx('privat', '2026-10-15T10:00:00', 1000000, 'Зарплата'),
      tx('privat', '2026-11-01T00:00:00', -99900, 'Листопад', { bankCategory: 'Супермаркети та продукти' }),
    ]),
    'a.xlsx',
  );
  const r = await getReport(db, oct);
  expect(r.incomeKop).toBe(1000000);
  expect(r.expenseKop).toBe(30000 + 20000 - 6900);
  expect(r.netKop).toBe(1000000 - r.expenseKop);
  expect(r.byCategory).toEqual([
    { category: 'groceries', amountKop: 30000, count: 1 },
    { category: 'cafe', amountKop: 13100, count: 2 },
  ]);
});

test('getMonthly returns zero-filled months in order', async () => {
  await ingestStatement(
    db,
    stmt('privat', [
      tx('privat', '2026-10-05T10:00:00', -10000, 'x'),
      tx('privat', '2026-08-05T10:00:00', 50000, 'Зарплата'),
    ]),
    'a.xlsx',
  );
  expect(await getMonthly(db, '2026-10', 4)).toEqual([
    { month: '2026-07', incomeKop: 0, expenseKop: 0, netKop: 0 },
    { month: '2026-08', incomeKop: 50000, expenseKop: 0, netKop: 50000 },
    { month: '2026-09', incomeKop: 0, expenseKop: 0, netKop: 0 },
    { month: '2026-10', incomeKop: 0, expenseKop: 10000, netKop: -10000 },
  ]);
  expect(await getMonthly(db, '2026-01', 2)).toHaveLength(2);
});

test('getTransactions filters by category and q (case-insensitive)', async () => {
  await ingestStatement(
    db,
    stmt('privat', [
      tx('privat', '2026-10-05T10:00:00', -10000, 'Сільпо 100%', { bankCategory: 'Супермаркети та продукти' }),
      tx('privat', '2026-10-06T10:00:00', -5000, 'КАВА Lviv', { bankCategory: 'Ресторани, кафе, бари' }),
      tx('privat', '2026-10-06T10:00:00', -4000, 'Кава other', { bankCategory: 'Ресторани, кафе, бари' }),
    ]),
    'a.xlsx',
  );
  const all = await getTransactions(db, oct);
  expect(all).toHaveLength(3);
  expect(all[0]).toMatchObject({ occurredAt: '2026-10-06T10:00:00', bank: 'privat', last4: '5143', kind: 'expense' });
  expect(all[0].id).toBeGreaterThan(all[1].id);
  expect(await getTransactions(db, oct, { category: 'groceries' })).toHaveLength(1);
  expect(await getTransactions(db, oct, { q: 'кава' })).toHaveLength(2);
  expect(await getTransactions(db, oct, { q: '100%' })).toHaveLength(1);
  expect(await getTransactions(db, oct, { q: '%' })).toHaveLength(1);
  expect(await getTransactions(db, oct, { q: '_' })).toHaveLength(0);
});

test('getLatestMonth on empty db → null', async () => {
  expect(await getLatestMonth(db)).toBeNull();
  await ingestStatement(db, stmt('privat', [tx('privat', '2026-09-05T10:00:00', -1, 'x')]), 'a.xlsx');
  expect(await getLatestMonth(db)).toBe('2026-09');
});

test('getMonthsWithData: distinct months ascending, empty db → []', async () => {
  expect(await getMonthsWithData(db)).toEqual([]);
  await ingestStatement(
    db,
    stmt('privat', [
      tx('privat', '2026-10-05T10:00:00', -100, 'a'),
      tx('privat', '2026-08-31T23:59:59', -100, 'b'),
      tx('privat', '2026-10-06T10:00:00', -100, 'c'),
      tx('privat', '2026-09-01T00:00:00', 500, 'd'),
    ]),
    'a.xlsx',
  );
  expect(await getMonthsWithData(db)).toEqual(['2026-08', '2026-09', '2026-10']);

  // a month holding only an internal row is excluded
  await ingestStatement(db, stmt('privat', [tx('privat', '2026-07-10T10:00:00', -100, 'own transfer')]), 'b.xlsx');
  expect(await getMonthsWithData(db)).toContain('2026-07');
  await db.update(transactions).set({ kind: 'internal' }).where(sql`${transactions.occurredAt} < '2026-08-01'`);
  expect(await getMonthsWithData(db)).toEqual(['2026-08', '2026-09', '2026-10']);
});

test('getLatestMonth ignores months holding only internal rows', async () => {
  await ingestStatement(db, stmt('privat', [tx('privat', '2026-09-05T10:00:00', -100, 'x')]), 'a.xlsx');
  await ingestStatement(db, stmt('privat', [tx('privat', '2026-11-05T10:00:00', -100, 'Переказ на свою картку')]), 'b.xlsx');
  expect(await getLatestMonth(db)).toBe('2026-09');
});
