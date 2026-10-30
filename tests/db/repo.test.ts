import { beforeEach, expect, test } from 'vitest';
import { createTestDb } from '../helpers/db';
import type { Db } from '@/db/client';
import { deleteUpload, ingestStatement, recomputeInternal } from '@/db/repo';
import { getReport, listUploads } from '@/db/reports';
import { transactions } from '@/db/schema';
import { stmt, tx } from './fixtures';

const oct = { from: '2026-10-01', to: '2026-10-31' };
let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const octRows = () => [
  tx('privat', '2026-10-05T10:00:00', -10000, 'Сільпо', { bankCategory: 'Супермаркети та продукти' }),
  tx('privat', '2026-10-06T10:00:00', -5000, 'Кафе', { bankCategory: 'Ресторани, кафе, бари' }),
];

test('same statement twice → second: added 0, duplicates N; report unchanged', async () => {
  const period = { from: '2026-10-01', to: '2026-10-31' };
  const r1 = await ingestStatement(db, stmt('privat', octRows(), period), 'a.xlsx');
  expect(r1).toMatchObject({ bank: 'privat', total: 2, added: 2, duplicates: 0 });
  const before = await getReport(db, oct);
  const r2 = await ingestStatement(db, stmt('privat', octRows(), period), 'a.xlsx');
  expect(r2).toMatchObject({ total: 2, added: 0, duplicates: 2 });
  expect(await getReport(db, oct)).toEqual(before);
  const ups = await listUploads(db);
  expect(ups).toHaveLength(2);
  expect(ups.find((u) => u.id === r1.uploadId)).toMatchObject({ added: 2, periodFrom: '2026-10-01', periodTo: '2026-10-31' });
});

test('overlapping Sep–Oct over Oct → only September rows added', async () => {
  await ingestStatement(db, stmt('privat', octRows()), 'oct.xlsx');
  const sep = [
    tx('privat', '2026-09-20T10:00:00', -7000, 'Аптека'),
    tx('privat', '2026-09-21T10:00:00', -3000, 'Таксі'),
  ];
  const r = await ingestStatement(db, stmt('privat', [...sep, ...octRows()]), 'sepoct.xlsx');
  expect(r).toMatchObject({ total: 4, added: 2, duplicates: 2 });
});

test('privat −75000 ₴ alone counts as expense; after mono +75000 ₴ upload the debit is internal, the credit is income', async () => {
  const base = tx('privat', '2026-10-05T10:00:00', -10000, 'Сільпо', { bankCategory: 'Супермаркети та продукти' });
  const transfer = tx('privat', '2026-10-10T12:00:00', -7500000, 'Переказ', { bankCategory: 'Перекази' });
  await ingestStatement(db, stmt('privat', [base, transfer]), 'p.xlsx');
  const expenseWithoutTransfer = 10000;
  expect((await getReport(db, oct)).expenseKop).toBe(expenseWithoutTransfer + 7500000);

  const res2 = await ingestStatement(db, stmt('mono', [tx('mono', '2026-10-10T12:01:00', 7500000, 'Від: Віталій')]), 'm.xlsx');
  expect(res2.internalFound).toBe(1);
  expect((await getReport(db, oct)).expenseKop).toBe(expenseWithoutTransfer);
  expect((await getReport(db, oct)).incomeKop).toBe(7500000);
});

test('deleteUpload of mono → privat transfer is expense again', async () => {
  await ingestStatement(db, stmt('privat', [tx('privat', '2026-10-10T12:00:00', -7500000, 'Переказ', { bankCategory: 'Перекази' })]), 'p.xlsx');
  const r = await ingestStatement(db, stmt('mono', [tx('mono', '2026-10-10T12:01:00', 7500000, 'Від: Віталій')]), 'm.xlsx');
  expect((await getReport(db, oct)).expenseKop).toBe(0);
  await deleteUpload(db, r.uploadId!);
  expect((await getReport(db, oct)).expenseKop).toBe(7500000);
  expect(await recomputeInternal(db)).toBe(0);
});

test('Oct uploaded, then Sep–Oct uploaded, delete the Oct upload → October report unchanged', async () => {
  const r1 = await ingestStatement(db, stmt('privat', octRows()), 'oct.xlsx');
  const sep = [tx('privat', '2026-09-20T10:00:00', -7000, 'Аптека')];
  const r2 = await ingestStatement(db, stmt('privat', [...sep, ...octRows()]), 'sepoct.xlsx');
  const before = await getReport(db, oct);
  expect(before.expenseKop).toBe(15000);
  await deleteUpload(db, r1.uploadId!);
  expect(await getReport(db, oct)).toEqual(before);
  const ups = await listUploads(db);
  expect(ups).toHaveLength(1);
  expect(ups[0]).toMatchObject({ id: r2.uploadId, added: 1 });
});

test('delete the only upload containing rows → rows gone', async () => {
  const r1 = await ingestStatement(db, stmt('privat', octRows()), 'oct.xlsx');
  await ingestStatement(db, stmt('privat', [tx('privat', '2026-09-20T10:00:00', -7000, 'Аптека')]), 'sep.xlsx');
  await deleteUpload(db, r1.uploadId!);
  expect((await getReport(db, oct)).expenseKop).toBe(0);
  const left = await db.select({ id: transactions.id }).from(transactions);
  expect(left).toHaveLength(1);
});

test('grocery purchase + incoming transfer of equal amount on other account → both counted', async () => {
  await ingestStatement(
    db,
    stmt('privat', [tx('privat', '2026-10-10T12:00:00', -50000, 'Сільпо', { bankCategory: 'Супермаркети та продукти' })]),
    'p.xlsx',
  );
  const r = await ingestStatement(db, stmt('mono', [tx('mono', '2026-10-10T18:00:00', 50000, 'Від: Друг')]), 'm.xlsx');
  expect(r.internalFound).toBe(0);
  const rep = await getReport(db, oct);
  expect(rep.expenseKop).toBe(50000);
  expect(rep.incomeKop).toBe(50000);
});

test('statement with 0 transactions → no upload row, counts 0, warnings returned', async () => {
  const empty = { ...stmt('privat', []), warnings: ['Нет операций'] };
  const r = await ingestStatement(db, empty, 'empty.xlsx');
  expect(r).toEqual({
    uploadId: null,
    bank: 'privat',
    total: 0,
    added: 0,
    duplicates: 0,
    internalFound: 0,
    warnings: ['Нет операций'],
  });
  expect(await listUploads(db)).toHaveLength(0);
});

test('internalFound counts pairs and marker rows, not rows', async () => {
  const other = { accountKey: '4149****0001' };
  const both = await ingestStatement(
    db,
    stmt('privat', [
      tx('privat', '2026-10-10T12:00:00', -20000, 'Переказ', { bankCategory: 'Перекази' }),
      tx('privat', '2026-10-10T12:01:00', 20000, 'Зарахування', { ...other, bankCategory: 'Зарахування' }),
    ]),
    'both.xlsx',
  );
  expect(both.internalFound).toBe(1);

  const marker = await ingestStatement(
    db,
    stmt('privat', [tx('privat', '2026-10-12T12:00:00', -30000, 'Переказ на свою картку')]),
    'marker.xlsx',
  );
  expect(marker.internalFound).toBe(1);
});
