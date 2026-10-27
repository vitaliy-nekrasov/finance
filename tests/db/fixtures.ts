import type { Bank, ParsedStatement, ParsedTransaction } from '@/lib/statement/types';

const KEY: Record<Bank, string> = { privat: '4149****5143', mono: 'UA000000000000000000000000001' };

export function tx(
  bank: Bank,
  occurredAt: string,
  amountKop: number,
  description: string,
  extra: Partial<ParsedTransaction> = {},
): ParsedTransaction {
  return {
    bank,
    accountKey: KEY[bank],
    occurredAt,
    amountKop,
    description,
    bankCategory: null,
    mcc: null,
    ...extra,
  };
}

export function stmt(
  bank: Bank,
  transactions: ParsedTransaction[],
  period: ParsedStatement['period'] = null,
): ParsedStatement {
  return {
    bank,
    accounts: [{ key: KEY[bank], bank, label: bank === 'privat' ? 'Приват' : 'Моно', last4: [KEY[bank].slice(-4)] }],
    period,
    transactions,
    warnings: [],
  };
}
