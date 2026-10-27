import type { Range } from '@/db/reports';

export type PeriodParams = { month?: string; from?: string; to?: string };

const MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_SHORT_GEN = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const yearOk = (y: number) => y >= 1900 && y <= 2999;
const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function validDate(s: string | undefined): { y: number; m: number; d: number } | null {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!mt) return null;
  const [y, m, d] = [Number(mt[1]), Number(mt[2]), Number(mt[3])];
  if (!yearOk(y) || m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return null;
  return { y, m, d };
}

function validMonth(s: string | undefined): boolean {
  const mt = MONTH_RE.exec(s ?? '');
  return !!mt && yearOk(Number(mt[1]));
}

export type PeriodChip = { month: string; label: string };

function chipLabel(m: string, selectedYear: string): string {
  const [y, mo] = m.split('-');
  const name = SHORT_MONTH_NOM[Number(mo) - 1];
  return y === selectedYear ? name : `${name} ${y.slice(2)}`;
}

/** Selected month plus up to 2 data months on each side (custom range: last 4 data months). */
export function neighbourChips(all: string[], selected: string | null, fallbackYear: string): PeriodChip[] {
  const set = new Set(all);
  let months: string[];
  if (selected) {
    set.add(selected);
    const sorted = [...set].sort();
    const i = sorted.indexOf(selected);
    months = sorted.slice(Math.max(0, i - 2), i + 3);
  } else {
    months = [...set].sort().slice(-4);
  }
  const year = selected ? selected.slice(0, 4) : fallbackYear;
  return months.map((m) => ({ month: m, label: chipLabel(m, year) }));
}

/** Relative change as '+4%' / '−6%' (U+2212); '—' when the base is 0. */
export function pct(cur: number, prev: number): string {
  if (prev === 0) return '—';
  const p = Math.round(((cur - prev) / prev) * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}%`;
}

export function prevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  const idx = y * 12 + (mo - 1) - 1;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS_NOM[mo - 1]} ${y}`;
}

function monthResult(m: string) {
  const mt = MONTH_RE.exec(m)!;
  const [y, mo] = [Number(mt[1]), Number(mt[2])];
  return {
    range: { from: `${m}-01`, to: `${m}-${pad(daysIn(y, mo))}` } as Range,
    label: monthLabel(m),
    month: m as string | null,
  };
}

/** Resolve URL params to a date range; garbage falls back to the latest month. */
export function resolvePeriod(
  sp: PeriodParams,
  latest: string | null,
): { range: Range; label: string; month: string | null } | null {
  const a = validDate(sp.from);
  const b = validDate(sp.to);
  if (sp.from && sp.to && a && b) {
    let [from, to] = [sp.from, sp.to];
    let [fa, fb] = [a, b];
    if (from > to) {
      [from, to] = [to, from];
      [fa, fb] = [fb, fa];
    }
    const part = (d: typeof a, withYear: boolean) =>
      `${d.d} ${MONTHS_SHORT_GEN[d.m - 1]}${withYear ? ` ${d.y}` : ''}`;
    const label =
      fa.y === fb.y ? `${part(fa, false)} – ${part(fb, true)}` : `${part(fa, true)} – ${part(fb, true)}`;
    return { range: { from, to }, label, month: null };
  }
  if (sp.month && validMonth(sp.month)) return monthResult(sp.month);
  return latest ? monthResult(latest) : null;
}

export const SHORT_MONTH_NOM = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/** '2026-10-26T12:00:00' -> '26 окт' */
export function formatDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS_SHORT_GEN[m - 1]}`;
}

/** Query string that preserves the current period in links. */
export function periodQuery(p: { range: Range; month: string | null }): string {
  return p.month ? `month=${p.month}` : `from=${p.range.from}&to=${p.range.to}`;
}
