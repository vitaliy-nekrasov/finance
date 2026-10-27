import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { getLatestMonth, getTransactions } from '@/db/reports';
import { CATEGORIES, INFLOW, type CategoryId } from '@/lib/categories';
import { formatUAH } from '@/lib/money';
import { periodQuery, resolvePeriod } from '@/lib/period';
import { parseTxSort, sortTx, TX_SORTS } from '@/lib/tx-sort';
import { Glass } from '@/components/Glass';
import { Rise } from '@/components/Rise';
import { TxList } from '@/components/TxList';

export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const inflow = id === INFLOW.id;
  if (!inflow && !Object.hasOwn(CATEGORIES, id)) notFound();
  const category = id as CategoryId;
  const raw = await searchParams;

  const db = getDb();
  const period = resolvePeriod({ month: first(raw.month), from: first(raw.from), to: first(raw.to) }, await getLatestMonth(db));
  if (!period) notFound();

  const rows = inflow
    ? await getTransactions(db, period.range, { inflow: true })
    : (await getTransactions(db, period.range, { category })).filter((r) => r.kind !== 'internal');
  const sum = (kind: 'income' | 'expense') => rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.amountKop, 0);
  const total = inflow
    ? rows.reduce((s, r) => s + r.amountKop, 0)
    : category === 'income'
      ? sum('income')
      : -sum('expense');
  const { emoji, name } = inflow ? INFLOW : CATEGORIES[category];
  const sort = parseTxSort(first(raw.sort));
  const q = periodQuery(period);

  return (
    <>
      <Link href={`/?${q}`} className="text-[13px] text-white/60 transition hover:text-white">
        ← {period.label}
      </Link>
      <Rise index={1} className="mt-2">
        <h1 className="text-[22px] font-bold leading-tight">
          {emoji} {name} · {formatUAH(total, { decimals: 0 })}
        </h1>
      </Rise>
      <Rise index={2} className="mt-3 flex gap-2">
        {TX_SORTS.map((s) => (
          <Link
            key={s.id}
            href={`/category/${id}?${q}${s.id === 'date' ? '' : `&sort=${s.id}`}`}
            replace
            scroll={false}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
              s.id === sort
                ? 'border-[#67e8f9]/60 bg-[#67e8f9]/15 text-[#67e8f9]'
                : 'border-white/[.12] bg-white/[.06] text-white/70'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </Rise>
      <Rise index={3} className="mt-3">
        <Glass className="px-3.5 py-1">
          <TxList rows={sortTx(rows, sort)} />
        </Glass>
      </Rise>
    </>
  );
}
