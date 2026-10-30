'use client';

import Link from 'next/link';
import { useState } from 'react';
import { glassClass } from './Glass';

import type { PeriodChip } from '@/lib/period';

export function PeriodPicker({
  label,
  selectedMonth,
  chips,
  from,
  to,
  basePath = '/',
  q,
  card,
}: {
  label: string;
  selectedMonth: string | null;
  chips: PeriodChip[];
  from: string;
  to: string;
  basePath?: string;
  q?: string;
  card?: string;
}) {
  const [custom, setCustom] = useState(selectedMonth === null);
  const chipBase = 'shrink-0 rounded-full border px-3 py-1.5 text-xs transition';
  const on = 'border-[#67e8f9]/60 bg-[#67e8f9]/15 text-[#67e8f9]';
  const off = 'border-white/[.12] bg-white/[.06] text-white/70';

  return (
    <div>
      <button
        type="button"
        onClick={() => setCustom((v) => !v)}
        aria-expanded={custom}
        className="flex items-center gap-1.5 text-[13px] text-white/70"
      >
        {label}
        <span aria-hidden className={`text-[10px] transition-transform ${custom ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {chips.map((c) => (
          <Link
            key={c.month}
            href={`${basePath}?month=${c.month}${q ? `&q=${encodeURIComponent(q)}` : ''}${card ? `&card=${encodeURIComponent(card)}` : ''}`}
            aria-current={c.month === selectedMonth ? 'true' : undefined}
            className={`${chipBase} ${c.month === selectedMonth ? on : off}`}
          >
            {c.label}
          </Link>
        ))}
        <button type="button" onClick={() => setCustom((v) => !v)} className={`${chipBase} ${selectedMonth === null ? on : off}`}>
          Свой период
        </button>
      </div>

      {custom && (
        <form action={basePath} method="get" className={`${glassClass} mt-2 grid grid-cols-2 gap-2 p-3`}>
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {card ? <input type="hidden" name="card" value={card} /> : null}
          <label className="min-w-0 text-[11px] text-white/55">
            С
            <input
              type="date"
              name="from"
              required
              defaultValue={from}
              className="mt-1 block w-full min-w-0 appearance-none rounded-lg border border-white/[.12] bg-white/[.06] px-2 py-1.5 text-xs text-white [color-scheme:dark]"
            />
          </label>
          <label className="min-w-0 text-[11px] text-white/55">
            По
            <input
              type="date"
              name="to"
              required
              defaultValue={to}
              className="mt-1 block w-full min-w-0 appearance-none rounded-lg border border-white/[.12] bg-white/[.06] px-2 py-1.5 text-xs text-white [color-scheme:dark]"
            />
          </label>
          <button type="submit" className="col-span-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium">
            Показать
          </button>
        </form>
      )}
    </div>
  );
}
