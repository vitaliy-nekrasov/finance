import { getDb } from '@/db/client';
import { getLatestMonth, getMonthsWithData, getTransactions } from '@/db/reports';
import { neighbourChips, resolvePeriod } from '@/lib/period';
import { Glass } from '@/components/Glass';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Rise } from '@/components/Rise';
import { TxList } from '@/components/TxList';
import { SearchBox } from './search-box';

export const metadata = { title: 'Операции' };
export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const db = getDb();
  const latest = await getLatestMonth(db);
  const period = latest
    ? resolvePeriod({ month: first(raw.month), from: first(raw.from), to: first(raw.to) }, latest)
    : null;
  const q = (first(raw.q) ?? '').trim().slice(0, 100);

  if (!latest || !period) {
    return (
      <>
        <h1 className="mb-3 text-[22px] font-bold">Операции</h1>
        <Glass className="p-5 text-center text-xs text-white/55">Пока нет операций. Загрузите выписки.</Glass>
      </>
    );
  }

  const [rows, dataMonths] = await Promise.all([
    getTransactions(db, period.range, { q: q || undefined }),
    getMonthsWithData(db),
  ]);

  return (
    <>
      <h1 className="mb-2 text-[22px] font-bold">Операции</h1>
      <Rise>
        <PeriodPicker
          label={period.label}
          selectedMonth={period.month}
          chips={neighbourChips(dataMonths, period.month, latest.slice(0, 4))}
          from={period.range.from}
          to={period.range.to}
          basePath="/transactions"
          q={q}
        />
      </Rise>
      <Rise index={1} className="mt-3">
        <SearchBox initial={q} />
      </Rise>
      <Rise index={2} className="mt-3">
        <Glass className="px-3.5 py-1">
          <TxList rows={rows} markInternal />
        </Glass>
      </Rise>
    </>
  );
}
