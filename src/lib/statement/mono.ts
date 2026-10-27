import { parseAmountToKop } from '@/lib/money';
import { cellText, isEmptyRow, parseKyivDate } from './cells';
import type { ParsedStatement, ParsedTransaction, Rows } from './types';

/** Без регистра, латинская/кириллическая «i» считаются одной буквой. */
export function normMono(s: unknown): string {
  return cellText(s).toLowerCase().replace(/і/g, 'i').replace(/\s+/g, ' ');
}

export interface MonoHeader {
  index: number;
  columns: { date: number; desc: number | null; mcc: number; amount: number | null; currency: string | null };
}

/** Шапка таблицы Моно: строка с ячейками «Дата і час операції» и «MCC». */
export function findMonoHeader(rows: Rows): MonoHeader | null {
  for (let i = 0; i < rows.length; i++) {
    const norm = rows[i].map(normMono);
    const date = norm.indexOf(normMono('Дата і час операції'));
    const mcc = norm.indexOf('mcc');
    if (date < 0 || mcc < 0) continue;
    const desc = norm.indexOf(normMono('Деталі операції'));
    const amount = norm.findIndex((c) => c.startsWith(normMono('Сума в валюті картки')));
    const cur = amount >= 0 ? norm[amount].match(/\(([a-z]{3})\)/) : null;
    return {
      index: i,
      columns: { date, desc: desc < 0 ? null : desc, mcc, amount: amount < 0 ? null : amount, currency: cur ? cur[1].toUpperCase() : null },
    };
  }
  return null;
}

const dashToNull = (v: unknown) => (cellText(v) === '—' ? null : v);

export function parseMono(rows: Rows): ParsedStatement {
  const statement: ParsedStatement = { bank: 'mono', accounts: [], period: null, transactions: [], warnings: [] };

  const header = findMonoHeader(rows);
  if (!header) {
    statement.warnings.push('Не найдена шапка таблицы (колонки «Дата і час операції» и «MCC»).');
    return statement;
  }

  // Над таблицей читаются только маски карт, IBAN и период; остальное не трогаем.
  let last4: string[] = [];
  let iban: string | null = null;
  for (let i = 0; i < header.index; i++) {
    const text = rows[i].map(cellText).filter(Boolean).join(' ');
    const norm = normMono(text);
    if (norm.startsWith(normMono('Інформація по картці'))) {
      last4 = [...text.matchAll(/\*+\s*(\d{4})\b/g)].map((m) => m[1]);
    } else if (norm.startsWith('рахунок')) {
      iban = text.match(/UA[0-9A-Z]{10,}/i)?.[0].toUpperCase() ?? null;
    } else if (norm.startsWith(normMono('Період'))) {
      const m = text.match(/(\d{2})\.(\d{2})\.(\d{4})\s*[-–—]\s*(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) statement.period = { from: `${m[3]}-${m[2]}-${m[1]}`, to: `${m[6]}-${m[5]}-${m[4]}` };
    }
  }

  const { columns } = header;
  if (columns.currency && columns.currency !== 'UAH') {
    statement.warnings.push(`Пропущена выписка в валюте, отличной от гривны (${columns.currency}).`);
    return statement;
  }
  if (!iban) {
    statement.warnings.push('Не найден номер счёта (IBAN) в шапке выписки.');
    return statement;
  }
  if (columns.amount === null) {
    statement.warnings.push('Не найдена колонка суммы в валюте карты.');
    return statement;
  }

  let skipped = 0;
  for (const row of rows.slice(header.index + 1)) {
    if (isEmptyRow(row)) continue;
    const occurredAt = parseKyivDate(row[columns.date] ?? null);
    const amountKop = parseAmountToKop(dashToNull(row[columns.amount] ?? null));
    if (!occurredAt || amountKop === null) {
      skipped++;
      continue;
    }
    const mccRaw = Number.parseInt(cellText(dashToNull(row[columns.mcc])), 10);
    const desc = columns.desc === null ? '' : cellText(dashToNull(row[columns.desc]));
    const tx: ParsedTransaction = {
      bank: 'mono',
      accountKey: iban,
      occurredAt,
      amountKop,
      description: desc,
      bankCategory: null,
      mcc: Number.isFinite(mccRaw) ? mccRaw : null,
    };
    statement.transactions.push(tx);
  }

  statement.accounts = [
    { key: iban, bank: 'mono', label: `Моно ${last4.map((l) => `*${l}`).join(', ') || iban.slice(-4)}`, last4 },
  ];
  if (skipped > 0) statement.warnings.push(`Пропущено ${skipped} строк, которые не удалось разобрать`);
  return statement;
}
