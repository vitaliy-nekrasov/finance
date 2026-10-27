import { formatUAH } from '@/lib/money';
import { formatDay } from '@/lib/period';
import type { TxRow } from '@/db/reports';

const BANK = { privat: 'Приват', mono: 'Моно' } as const;

export function TxList({ rows, markInternal = false }: { rows: TxRow[]; markInternal?: boolean }) {
  if (rows.length === 0) return <p className="px-1 py-3 text-xs text-white/55">Операций нет</p>;
  return (
    <ul>
      {rows.map((t) => {
        const dim = markInternal && t.kind === 'internal';
        return (
          <li
            key={t.id}
            className={`flex items-center justify-between gap-3 border-b border-white/[.08] py-2.5 last:border-0 ${dim ? 'opacity-50' : ''}`}
          >
            <div className="min-w-0">
              <div className="truncate text-[13px]">{t.description}</div>
              <div className="mt-0.5 text-[10px] text-white/50">
                {formatDay(t.occurredAt)} · {BANK[t.bank] ?? t.bank}
                {t.last4 ? ` *${t.last4}` : ''}
                {dim ? ' · между своими' : ''}
              </div>
            </div>
            <div
              className={`shrink-0 text-[13px] font-semibold tabular-nums ${t.amountKop > 0 && !dim ? 'text-emerald-300' : ''}`}
            >
              {formatUAH(t.amountKop, { sign: true })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
