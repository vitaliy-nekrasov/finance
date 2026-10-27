import type { Range } from '@/db/reports';

export type PeriodParams = { month?: string; from?: string; to?: string };

const MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_SHORT_GEN = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function validDate(s: string | undefined): { y: number; m: number; d: number } | null {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!mt) return null;
  const [y, m, d] = [Number(mt[1]), Number(mt[2]), Number(mt[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return null;
  return { y, m, d };
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
  if (sp.month && MONTH_RE.test(sp.month)) return monthResult(sp.month);
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
