export type Bank = 'privat' | 'mono';

export interface ParsedTransaction {
  bank: Bank;
  accountKey: string; // Приват: '4149****5143'; Моно: IBAN
  occurredAt: string; // 'YYYY-MM-DDTHH:mm:ss', киевское время
  amountKop: number; // со знаком, в валюте карты (UAH)
  description: string;
  bankCategory: string | null; // Приват: 'Категорія'; Моно: null
  mcc: number | null; // Моно: MCC; Приват: null
}

export interface ParsedAccount {
  key: string;
  bank: Bank;
  label: string;
  last4: string[];
}

export interface ParsedStatement {
  bank: Bank;
  accounts: ParsedAccount[];
  period: { from: string; to: string } | null; // 'YYYY-MM-DD'
  transactions: ParsedTransaction[];
  warnings: string[]; // по-русски, для экрана загрузки
}

/** Результат XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) */
export type Rows = unknown[][];
