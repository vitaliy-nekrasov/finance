import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const run = async (pg: PGlite, file: string) => {
  const sqlText = readFileSync(path.resolve(__dirname, '../../drizzle', file), 'utf8');
  for (const stmt of sqlText.split('--> statement-breakpoint')) {
    if (stmt.trim()) await pg.exec(stmt);
  }
};

test('0001 migrates transactions.upload_id into upload_transactions', async () => {
  const pg = new PGlite();
  await run(pg, '0000_broken_silvermane.sql');
  await pg.exec(`
    insert into uploads (id, filename, bank) values (1, 'a.xlsx', 'privat'), (2, 'b.xlsx', 'mono');
    insert into transactions (id, dedup_key, upload_id, bank, account_key, occurred_at, amount_kop, description, category, kind)
    values (10, 'k10', 1, 'privat', 'A', '2026-10-01 10:00:00', -100, 'x', 'other', 'expense'),
           (11, 'k11', 2, 'mono', 'B', '2026-10-02 10:00:00', -200, 'y', 'other', 'expense');
  `);
  await run(pg, '0001_upload_membership.sql');
  const { rows } = await pg.query<{ upload_id: number; transaction_id: number }>(
    'select upload_id, transaction_id from upload_transactions order by transaction_id',
  );
  expect(rows).toEqual([
    { upload_id: 1, transaction_id: 10 },
    { upload_id: 2, transaction_id: 11 },
  ]);
  const cols = await pg.query(
    `select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'upload_id'`,
  );
  expect(cols.rows).toHaveLength(0);
  await pg.close();
});
