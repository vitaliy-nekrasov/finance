import { parseAmountToKop } from '@/lib/money';
import { cellText, findHeader, isEmptyRow, parseKyivDate } from './cells';
import type { ParsedAccount, ParsedStatement, ParsedTransaction, Rows } from './types';

const COL = {
  date: 'Дата',
  category: 'Категорія',
  card: 'Картка',
  desc: 'Опис операції',
  amount: 'Сума в валюті картки',
  currency: 'Валюта картки',
} as const;

function isoFromDmy(s: string): string {
  const [d, m, y] = s.split('.');
  return `${y}-${m}-${d}`;
}

export function parsePrivat(rows: Rows): ParsedStatement {
  const statement: ParsedStatement = {
    bank: 'privat',
    accounts: [],
    period: null,
    transactions: [],
    warnings: [],
  };

  const header = findHeader(rows, [COL.date, COL.desc]);
  if (!header) {
    statement.warnings.push('Не найдена шапка таблицы (колонки «Дата» и «Опис операції»).');
    return statement;
  }

  for (let i = 0; i < header.index; i++) {
    const m = rows[i].map(cellText).join(' ').match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
    if (m) {
      statement.period = { from: isoFromDmy(m[1]), to: isoFromDmy(m[2]) };
      break;
    }
  }

  const col = (name: string) => header.columns.get(name);
  const at = (row: unknown[], name: string) => {
    const j = col(name);
    return j === undefined ? null : row[j] ?? null;
  };

  const accounts = new Map<string, ParsedAccount>();
  let skippedCurrency = 0;
  let skipped = 0;

  for (const row of rows.slice(header.index + 1)) {
    if (isEmptyRow(row)) continue;
    const occurredAt = parseKyivDate(at(row, COL.date));
    const amountKop = parseAmountToKop(at(row, COL.amount));
    if (!occurredAt || amountKop === null) {
      skipped++;
      continue;
    }

    const currency = cellText(at(row, COL.currency)).toUpperCase();
    if (currency && currency !== 'UAH') {
      skippedCurrency++;
      continue;
    }

    const accountKey = cellText(at(row, COL.card)).replace(/\s+/g, '').replace(/\*+/g, '****');
    if (!accountKey) continue;
    if (!accounts.has(accountKey)) {
      const last4 = accountKey.match(/(\d{4})$/)?.[1] ?? accountKey;
      accounts.set(accountKey, { key: accountKey, bank: 'privat', label: `Приват *${last4}`, last4: [last4] });
    }

    const tx: ParsedTransaction = {
      bank: 'privat',
      accountKey,
      occurredAt,
      amountKop,
      description: cellText(at(row, COL.desc)),
      bankCategory: cellText(at(row, COL.category)) || null,
      mcc: null,
    };
    statement.transactions.push(tx);
  }

  statement.accounts = [...accounts.values()];
  if (skippedCurrency > 0) {
    statement.warnings.push(
      `Пропущено операций в валюте, отличной от гривны: ${skippedCurrency}.`,
    );
  }
  if (skipped > 0) statement.warnings.push(`Пропущено ${skipped} строк, которые не удалось разобрать`);
  return statement;
}
