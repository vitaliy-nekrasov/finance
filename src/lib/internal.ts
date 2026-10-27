export interface InternalCandidate {
  id: number;
  accountKey: string;
  occurredAt: string;
  amountKop: number;
  description: string;
  bankCategory: string | null;
}

const MARKER_CATEGORY = 'Зарахування зі своєї картки';
const MARKER_DESCRIPTION = /(на|зі|з) сво(єї|ю) картк/i;
const MAX_GAP_MS = 48 * 60 * 60 * 1000;

// Wall-time string parsed as if UTC: no local time zone involved.
function wallMs(s: string): number {
  return Date.parse(s.endsWith('Z') ? s : `${s}Z`);
}

export function findInternalTransfers(txs: InternalCandidate[]): Set<number> {
  const internal = new Set<number>();

  for (const t of txs) {
    if (t.bankCategory === MARKER_CATEGORY || MARKER_DESCRIPTION.test(t.description)) {
      internal.add(t.id);
    }
  }

  // Group by |amount|, split into debits/credits.
  const groups = new Map<number, { debits: InternalCandidate[]; credits: InternalCandidate[] }>();
  for (const t of txs) {
    if (t.amountKop === 0) continue;
    const abs = Math.abs(t.amountKop);
    let g = groups.get(abs);
    if (!g) groups.set(abs, (g = { debits: [], credits: [] }));
    (t.amountKop < 0 ? g.debits : g.credits).push(t);
  }

  const used = new Set<number>();
  for (const { debits, credits } of groups.values()) {
    const pairs: { dt: number; debit: number; credit: number }[] = [];
    for (const d of debits) {
      const dMs = wallMs(d.occurredAt);
      for (const cr of credits) {
        if (cr.accountKey === d.accountKey) continue;
        const dt = Math.abs(wallMs(cr.occurredAt) - dMs);
        if (dt <= MAX_GAP_MS) pairs.push({ dt, debit: d.id, credit: cr.id });
      }
    }
    pairs.sort((a, b) => a.dt - b.dt || a.debit - b.debit || a.credit - b.credit);
    for (const p of pairs) {
      if (used.has(p.debit) || used.has(p.credit)) continue;
      used.add(p.debit);
      used.add(p.credit);
      internal.add(p.debit);
      internal.add(p.credit);
    }
  }

  return internal;
}
