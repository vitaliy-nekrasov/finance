import type { Rows } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

function fmt(y: number, mo: number, d: number, h: number, mi: number, s: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  return `${String(y).padStart(4, '0')}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
}

/** Дата/время → 'YYYY-MM-DDTHH:mm:ss' (настенное время, без конвертации часовых поясов). */
export function parseKyivDate(v: unknown): string | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    // SheetJS cellDates даёт локальные Date — читаем локальными геттерами.
    return fmt(v.getFullYear(), v.getMonth() + 1, v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds());
  }
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  return fmt(+m[3], +m[2], +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
}

export function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  // NFC: банки иногда пишут «ї» как «і» + U+0308
  return String(v).normalize('NFC').trim();
}

export function isEmptyRow(row: unknown[]): boolean {
  return row.every((c) => cellText(c) === '');
}

/** Первая строка, содержащая все указанные названия колонок; возвращает индекс строки и карту название → индекс колонки. */
export function findHeader(
  rows: Rows,
  required: string[],
): { index: number; columns: Map<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    const columns = new Map<string, number>();
    rows[i].forEach((c, j) => {
      const t = cellText(c);
      if (t && !columns.has(t)) columns.set(t, j);
    });
    if (required.every((r) => columns.has(r))) return { index: i, columns };
  }
  return null;
}
