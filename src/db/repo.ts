import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from './client';
import { accounts, transactions, uploads } from './schema';
import { categorize, classifyKind, type CategoryId, type Kind } from '@/lib/categories';
import { withDedupKeys } from '@/lib/dedup';
import { findInternalTransfers, type InternalCandidate } from '@/lib/internal';
import type { Bank, ParsedStatement } from '@/lib/statement/types';

export interface IngestResult {
  uploadId: number;
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
        uploadId,
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

    await recomputeInternal(trx);

    const [{ n }] = await trx
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.uploadId, uploadId), eq(transactions.kind, 'internal')));

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
      internalFound: n,
      warnings: s.warnings,
    };
  });
}

export async function deleteUpload(db: Db, uploadId: number): Promise<void> {
  await db.transaction(async (trx) => {
    await trx.delete(uploads).where(eq(uploads.id, uploadId));
    await recomputeInternal(trx);
  });
}

/** Resets every kind to classifyKind and re-marks internal transfers. Returns the number of internal rows. */
export async function recomputeInternal(db: Db): Promise<number> {
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
  const internal = findInternalTransfers(candidates);

  const toUpdate: Record<Kind, number[]> = { expense: [], income: [], internal: [] };
  for (const r of all) {
    const next: Kind = internal.has(r.id) ? 'internal' : classifyKind(r.amountKop, r.category as CategoryId);
    if (next !== r.kind) toUpdate[next].push(r.id);
  }
  for (const kind of Object.keys(toUpdate) as Kind[]) {
    for (const ids of chunks(toUpdate[kind], UPDATE_CHUNK)) {
      await db.update(transactions).set({ kind }).where(inArray(transactions.id, ids));
    }
  }
  return internal.size;
}
