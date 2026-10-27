import Link from 'next/link';
import { getDb } from '@/db/client';
import { getLatestMonth, getMonthly, getMonthsWithData, getReport } from '@/db/reports';
import { CATEGORIES } from '@/lib/categories';
import { formatUAH } from '@/lib/money';
import { neighbourChips, pct, periodQuery, prevMonth, resolvePeriod, SHORT_MONTH_NOM, type PeriodParams } from '@/lib/period';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { CategoryBars } from '@/components/CategoryBars';
import { Glass } from '@/components/Glass';
import { MonthlyBars } from '@/components/MonthlyBars';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Rise } from '@/components/Rise';

export const metadata = { title: 'Обзор' };
export const dynamic = 'force-dynamic';

const MONTHS_LOWER = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);


export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const sp: PeriodParams = { month: first(raw.month), from: first(raw.from), to: first(raw.to) };
  const db = getDb();
  const latest = await getLatestMonth(db);
  const period = latest ? resolvePeriod(sp, latest) : null;

  if (!latest || !period) {
    return (
      <>
        <div className="text-xs text-white/60">Семейные финансы</div>
        <h1 className="mb-3 text-[22px] font-bold">Обзор</h1>
        <Rise>
          <Glass className="p-5 text-center">
            <div className="text-[15px] font-semibold">Загрузите первые выписки</div>
            <p className="mt-1 text-xs text-white/55">Приват и monobank · Excel</p>
            <Link href="/upload" className="mt-4 inline-block rounded-xl bg-white/15 px-4 py-2 text-[13px] font-medium">
              Перейти к загрузке
            </Link>
          </Glass>
        </Rise>
      </>
    );
  }

  const anchor = period.month ?? period.range.to.slice(0, 7);
  const [report, monthly, dataMonths] = await Promise.all([
    getReport(db, period.range),
    getMonthly(db, anchor, 6),
    getMonthsWithData(db),
  ]);

  const q = periodQuery(period);
  const positive = report.netKop >= 0;
  const max = report.byCategory[0]?.amountKop ?? 1;
  const cur = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];

  return (
    <>
      <Rise>
        <PeriodPicker
          label={period.label}
          selectedMonth={period.month}
          chips={neighbourChips(dataMonths, period.month, latest.slice(0, 4))}
          from={period.range.from}
          to={period.range.to}
        />
      </Rise>

      <Rise index={1} className="mt-3">
        <div className="text-[13px] text-white/60">{period.month ? 'Итог месяца' : 'Итог периода'}</div>
        <AnimatedNumber
          value={report.netKop}
          sign
          className="block text-[38px] font-bold leading-tight tracking-[-1px] bg-clip-text text-transparent"
          style={{
            backgroundImage: positive
              ? 'linear-gradient(90deg,#a7f3d0,#67e8f9)'
              : 'linear-gradient(90deg,#fda4af,#f472b6)',
          }}
        />
      </Rise>

      <Rise index={2} className="mt-3 flex gap-2.5">
        <Glass className="flex-1 p-3.5">
          <div className="text-[11px] text-white/55">Доходы</div>
          <AnimatedNumber value={report.incomeKop} className="mt-0.5 block text-[17px] font-semibold" />
        </Glass>
        <Glass className="flex-1 p-3.5">
          <div className="text-[11px] text-white/55">Расходы</div>
          <AnimatedNumber value={report.expenseKop} className="mt-0.5 block text-[17px] font-semibold" />
        </Glass>
      </Rise>

      <Rise index={3} className="mt-3">
        <Glass className="p-3.5">
          <div className="mb-1 text-[11px] text-white/55">Куда ушли деньги</div>
          {report.byCategory.length === 0 ? (
            <p className="py-2 text-xs text-white/55">За этот период расходов нет</p>
          ) : (
            <CategoryBars
              rows={report.byCategory.map((c) => ({
                id: c.category,
                emoji: CATEGORIES[c.category].emoji,
                name: CATEGORIES[c.category].name,
                amountText: formatUAH(c.amountKop, { decimals: 0 }),
                ratio: c.amountKop / max,
                href: `/category/${c.category}?${q}`,
              }))}
            />
          )}
        </Glass>
      </Rise>

      <Rise index={4} className="mt-3">
        <Glass className="p-3.5">
          <div className="mb-2 text-[11px] text-white/55">По месяцам</div>
          <MonthlyBars
            items={monthly.map((m) => ({
              month: m.month,
              label: SHORT_MONTH_NOM[Number(m.month.slice(5)) - 1],
              netKop: m.netKop,
              amountText: formatUAH(m.netKop, { sign: true, decimals: 0 }).replace(/\s₴$/, ''),
              selected: m.month === anchor,
            }))}
          />
          {period.month && (
            <p className="mt-3 text-[11px] text-white/55">
              vs {MONTHS_LOWER[Number(prevMonth(anchor).slice(5)) - 1]}: Расходы {pct(cur.expenseKop, prev.expenseKop)} ·
              Доходы {pct(cur.incomeKop, prev.incomeKop)}
            </p>
          )}
        </Glass>
      </Rise>
    </>
  );
}
