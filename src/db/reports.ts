import { and, desc, eq, gte, sql, type SQL } from 'drizzle-orm';
import type { Db } from './client';
import { toWallTime } from './repo';
import { accounts, transactions, uploads } from './schema';
import type { CategoryId, Kind } from '@/lib/categories';
import type { Bank } from '@/lib/statement/types';

export interface Range {
  from: string; // 'YYYY-MM-DD', inclusive
  to: string; // 'YYYY-MM-DD', inclusive
}

export type TxRow = {
  id: number;
  occurredAt: string;
  amountKop: number;
  description: string;
  category: CategoryId;
  kind: Kind;
  bank: Bank;
  last4: string | null;
};

const inRange = (r: Range): SQL =>
  and(
    gte(transactions.occurredAt, `${r.from}T00:00:00`),
    sql`${transactions.occurredAt} < (${r.to}::date + 1)::timestamp`,
  )!;

export async function getReport(db: Db, r: Range) {
  const rows = await db
    .select({
      category: transactions.category,
      kind: transactions.kind,
      sum: sql<string>`sum(${transactions.amountKop})`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(and(inRange(r), sql`${transactions.kind} <> 'internal'`))
    .groupBy(transactions.category, transactions.kind);

  let incomeKop = 0;
  let expenseKop = 0;
  const byCategory: { category: CategoryId; amountKop: number; count: number }[] = [];
  for (const row of rows) {
    const sum = Number(row.sum);
    if (row.kind === 'income') {
      incomeKop += sum;
    } else if (row.kind === 'expense') {
      expenseKop += -sum;
      byCategory.push({ category: row.category as CategoryId, amountKop: -sum, count: row.count });
    }
  }
  return {
    incomeKop,
    expenseKop,
    netKop: incomeKop - expenseKop,
    byCategory: byCategory.filter((c) => c.amountKop > 0).sort((a, b) => b.amountKop - a.amountKop),
  };
}

function monthsEndingAt(toMonth: string, months: number): string[] {
  const [y, m] = toMonth.split('-').map(Number);
  const out: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    out.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`);
  }
  return out;
}

export async function getMonthly(db: Db, toMonth: string, months: number) {
  const list = monthsEndingAt(toMonth, months);
  const month = sql<string>`to_char(${transactions.occurredAt}, 'YYYY-MM')`;
  const rows = await db
    .select({
      month,
      kind: transactions.kind,
      sum: sql<string>`sum(${transactions.amountKop})`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.occurredAt, `${list[0]}-01T00:00:00`),
        sql`${transactions.occurredAt} < (${`${toMonth}-01`}::date + interval '1 month')`,
        sql`${transactions.kind} <> 'internal'`,
      ),
    )
    .groupBy(month, transactions.kind);

  const acc = new Map(list.map((m) => [m, { month: m, incomeKop: 0, expenseKop: 0, netKop: 0 }]));
  for (const row of rows) {
    const e = acc.get(row.month);
    if (!e) continue;
    const sum = Number(row.sum);
    if (row.kind === 'income') e.incomeKop += sum;
    else if (row.kind === 'expense') e.expenseKop += -sum;
  }
  return list.map((m) => {
    const e = acc.get(m)!;
    return { ...e, netKop: e.incomeKop - e.expenseKop };
  });
}

export async function getTransactions(
  db: Db,
  r: Range,
  f: { category?: CategoryId; q?: string } = {},
): Promise<TxRow[]> {
  const conds: SQL[] = [inRange(r)];
  if (f.category) conds.push(eq(transactions.category, f.category));
  if (f.q) {
    const esc = f.q.replace(/[\\%_]/g, '\\$&');
    conds.push(sql`${transactions.description} ILIKE ${`%${esc}%`} ESCAPE '\\'`);
  }
  const rows = await db
    .select({
      id: transactions.id,
      occurredAt: transactions.occurredAt,
      amountKop: transactions.amountKop,
      description: transactions.description,
      category: transactions.category,
      kind: transactions.kind,
      bank: transactions.bank,
      last4: sql<string | null>`(${accounts.last4})[1]`,
    })
    .from(transactions)
    .leftJoin(accounts, eq(accounts.key, transactions.accountKey))
    .where(and(...conds))
    .orderBy(desc(transactions.occurredAt), desc(transactions.id));
  return rows.map((row) => ({
    ...row,
    occurredAt: toWallTime(row.occurredAt),
    category: row.category as CategoryId,
    kind: row.kind as Kind,
    bank: row.bank as Bank,
    last4: row.last4 ?? null,
  }));
}

export async function getLatestMonth(db: Db): Promise<string | null> {
  const [row] = await db
    .select({ m: sql<string | null>`to_char(max(${transactions.occurredAt}), 'YYYY-MM')` })
    .from(transactions);
  return row?.m ?? null;
}

/** Months ('YYYY-MM', ascending) that have at least one non-internal transaction. */
export async function getMonthsWithData(db: Db): Promise<string[]> {
  const month = sql<string>`to_char(${transactions.occurredAt}, 'YYYY-MM')`;
  const rows = await db
    .selectDistinct({ month })
    .from(transactions)
    .where(sql`${transactions.kind} <> 'internal'`)
    .orderBy(month);
  return rows.map((r) => r.month);
}

export async function listUploads(db: Db) {
  const rows = await db.select().from(uploads).orderBy(desc(uploads.uploadedAt), desc(uploads.id));
  return rows.map((u) => ({
    id: u.id,
    filename: u.filename,
    bank: u.bank as Bank,
    uploadedAt: u.uploadedAt,
    periodFrom: u.periodFrom,
    periodTo: u.periodTo,
    added: u.added,
  }));
}
