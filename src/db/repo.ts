import { eq, inArray, sql } from 'drizzle-orm';
import type { Db } from './client';
import { accounts, transactions, uploadTransactions, uploads } from './schema';
import { categorize, classifyKind, type CategoryId, type Kind } from '@/lib/categories';
import { withDedupKeys } from '@/lib/dedup';
import { findInternalGroups, type InternalCandidate } from '@/lib/internal';
import type { Bank, ParsedStatement } from '@/lib/statement/types';

export interface IngestResult {
  /** null when the statement had no transactions: nothing is stored. */
  uploadId: number | null;
  bank: Bank;
  total: number;
  added: number;
  duplicates: number;
  internalFound: number;
  warnings: string[];
}

const INSERT_CHUNK = 500;
const UPDATE_CHUNK = 5000;

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Postgres returns 'YYYY-MM-DD HH:mm:ss'; the app uses 'YYYY-MM-DDTHH:mm:ss'. */
export const toWallTime = (s: string): string => s.replace(' ', 'T');

export async function ingestStatement(db: Db, s: ParsedStatement, filename: string): Promise<IngestResult> {
  if (s.transactions.length === 0) {
    return { uploadId: null, bank: s.bank, total: 0, added: 0, duplicates: 0, internalFound: 0, warnings: s.warnings };
  }
  return db.transaction(async (trx) => {
    const [upload] = await trx
      .insert(uploads)
      .values({
        filename,
        bank: s.bank,
        periodFrom: s.period?.from ?? null,
        periodTo: s.period?.to ?? null,
        total: s.transactions.length,
      })
      .returning({ id: uploads.id });
    const uploadId = upload.id;

    for (const a of s.accounts) {
      await trx
        .insert(accounts)
        .values({ key: a.key, bank: a.bank, label: a.label, last4: a.last4 })
        .onConflictDoUpdate({
          target: accounts.key,
          set: { bank: a.bank, label: a.label, last4: a.last4 },
        });
    }

    const rows = withDedupKeys(s.transactions).map((t) => {
      const category = categorize(t);
      return {
        dedupKey: t.dedupKey,
        bank: t.bank,
        accountKey: t.accountKey,
        occurredAt: t.occurredAt,
        amountKop: t.amountKop,
        description: t.description,
        bankCategory: t.bankCategory,
        mcc: t.mcc,
        category,
        kind: classifyKind(t.amountKop, category) as Kind,
      };
    });

    let added = 0;
    for (const part of chunks(rows, INSERT_CHUNK)) {
      const inserted = await trx
        .insert(transactions)
        .values(part)
        .onConflictDoNothing({ target: transactions.dedupKey })
        .returning({ id: transactions.id });
      added += inserted.length;
    }

    // Membership for every row of the statement, newly inserted or already known.
    const mine = new Set<number>();
    for (const part of chunks(rows, INSERT_CHUNK)) {
      const ids = await trx
        .select({ id: transactions.id })
        .from(transactions)
        .where(inArray(transactions.dedupKey, part.map((r) => r.dedupKey)));
      if (ids.length === 0) continue;
      for (const { id } of ids) mine.add(id);
      await trx
        .insert(uploadTransactions)
        .values(ids.map(({ id }) => ({ uploadId, transactionId: id })))
        .onConflictDoNothing();
    }

    // Pairs and lone marker rows that involve this upload's rows.
    const groups = await recompute(trx);
    const internalFound = groups.filter((g) => g.some((id) => mine.has(id))).length;

    await trx
      .update(uploads)
      .set({ added, duplicates: rows.length - added })
      .where(eq(uploads.id, uploadId));

    return {
      uploadId,
      bank: s.bank,
      total: rows.length,
      added,
      duplicates: rows.length - added,
      internalFound,
      warnings: s.warnings,
    };
  });
}

export async function deleteUpload(db: Db, uploadId: number): Promise<void> {
  await db.transaction(async (trx) => {
    await trx.delete(uploads).where(eq(uploads.id, uploadId)); // cascades its membership rows
    // Drop only rows that no remaining upload contains.
    await trx
      .delete(transactions)
      .where(
        sql`not exists (select 1 from ${uploadTransactions} where ${uploadTransactions.transactionId} = ${transactions.id})`,
      );
    await recomputeInternal(trx);
  });
}

/**
 * Resets every kind to classifyKind and re-marks internal transfers: the outgoing side of a transfer
 * between own cards is 'internal' (not an expense), the incoming side counts as income.
 * Returns the number of rows that belong to internal groups.
 */
export async function recomputeInternal(db: Db): Promise<number> {
  return (await recompute(db)).flat().length;
}

/** recomputeInternal, returning the internal groups (pairs and lone marker rows). */
async function recompute(db: Db): Promise<number[][]> {
  const all = await db
    .select({
      id: transactions.id,
      accountKey: transactions.accountKey,
      occurredAt: transactions.occurredAt,
      amountKop: transactions.amountKop,
      description: transactions.description,
      bankCategory: transactions.bankCategory,
      category: transactions.category,
      kind: transactions.kind,
    })
    .from(transactions);

  const candidates: InternalCandidate[] = all.map((r) => ({
    id: r.id,
    accountKey: r.accountKey,
    occurredAt: toWallTime(r.occurredAt),
    amountKop: r.amountKop,
    description: r.description,
    bankCategory: r.bankCategory,
    category: r.category as CategoryId,
  }));
  const groups = findInternalGroups(candidates);
  const internal = new Set(groups.flat());

  const toUpdate: Record<Kind, number[]> = { expense: [], income: [], internal: [] };
  for (const r of all) {
    const next: Kind = internal.has(r.id)
      ? r.amountKop < 0
        ? 'internal'
        : 'income'
      : classifyKind(r.amountKop, r.category as CategoryId);
    if (next !== r.kind) toUpdate[next].push(r.id);
  }
  for (const kind of Object.keys(toUpdate) as Kind[]) {
    for (const ids of chunks(toUpdate[kind], UPDATE_CHUNK)) {
      await db.update(transactions).set({ kind }).where(inArray(transactions.id, ids));
    }
  }
  return groups;
}
