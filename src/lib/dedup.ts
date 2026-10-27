import { createHash } from 'node:crypto';
import type { ParsedTransaction } from '@/lib/statement/types';

/**
 * Adds a stable dedupKey: sha256(bank|accountKey|occurredAt|amountKop|description|n),
 * where n is the ordinal among identical tuples within this statement.
 */
export function withDedupKeys<T extends ParsedTransaction>(txs: T[]): (T & { dedupKey: string })[] {
  const seen = new Map<string, number>();
  return txs.map((t) => {
    const base = [t.bank, t.accountKey, t.occurredAt, t.amountKop, t.description].join('|');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const dedupKey = createHash('sha256').update(`${base}|${n}`).digest('hex');
    return { ...t, dedupKey };
  });
}
