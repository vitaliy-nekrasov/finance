import { describe, it, expect } from 'vitest';
import { withDedupKeys } from '@/lib/dedup';
import type { ParsedTransaction } from '@/lib/statement/types';

const t1: ParsedTransaction = {
  bank: 'mono', accountKey: 'UA1', occurredAt: '2026-01-01T10:00:00', amountKop: -500,
  description: 'Coffee', bankCategory: null, mcc: 5814,
};

describe('withDedupKeys', () => {
  it('identical ops in one statement get distinct keys, stable across runs', () => {
    const a = withDedupKeys([t1, { ...t1 }]);
    const b = withDedupKeys([t1, { ...t1 }]);
    expect(a[0].dedupKey).not.toBe(a[1].dedupKey);
    expect(a.map((x) => x.dedupKey)).toEqual(b.map((x) => x.dedupKey));
    expect(a[0].dedupKey).toMatch(/^[0-9a-f]{64}$/);
  });
  it('different ops get different keys and keep fields', () => {
    const r = withDedupKeys([t1, { ...t1, amountKop: -600 }]);
    expect(r[0].dedupKey).not.toBe(r[1].dedupKey);
    expect(r[0].mcc).toBe(5814);
  });
  it('same op re-uploaded in another batch gets the same key', () => {
    expect(withDedupKeys([t1])[0].dedupKey).toBe(withDedupKeys([{ ...t1 }])[0].dedupKey);
  });
});
