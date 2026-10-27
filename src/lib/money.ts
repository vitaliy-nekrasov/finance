const NBSP = ' ';
const MINUS = '−';

export function formatUAH(
  kop: number,
  opts: { sign?: boolean; decimals?: 'auto' | 0 } = {},
): string {
  const { sign = false, decimals = 'auto' } = opts;
  const abs = Math.abs(Math.round(kop));
  const cents = abs % 100;
  const showCents = decimals === 'auto' && cents !== 0;
  const hryvnias = decimals === 0 ? Math.round(abs / 100) : Math.floor(abs / 100);

  let body = String(hryvnias).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  if (showCents) body += ',' + String(cents).padStart(2, '0');

  const isZero = hryvnias === 0 && !showCents;
  let prefix = '';
  if (!isZero) {
    if (kop < 0) prefix = MINUS;
    else if (sign) prefix = '+';
  }
  return `${prefix}${body}${NBSP}₴`;
}

export function parseAmountToKop(v: unknown): number | null {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? Math.round(v * 100) : null;
  }
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s ]/g, '').replace(',', '.');
  if (!/\d/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
