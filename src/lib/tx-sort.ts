export type TxSort = 'date' | 'amount-desc' | 'amount-asc';

export const TX_SORTS: { id: TxSort; label: string }[] = [
  { id: 'date', label: 'По дате' },
  { id: 'amount-desc', label: 'Сумма ↓' },
  { id: 'amount-asc', label: 'Сумма ↑' },
];

export function parseTxSort(v: string | undefined): TxSort {
  return v === 'amount-desc' || v === 'amount-asc' ? v : 'date';
}

/** 'date' keeps the query order (newest first); amounts compare by absolute value. */
export function sortTx<T extends { amountKop: number }>(rows: T[], sort: TxSort): T[] {
  if (sort === 'date') return rows;
  const dir = sort === 'amount-desc' ? -1 : 1;
  return [...rows].sort((a, b) => dir * (Math.abs(a.amountKop) - Math.abs(b.amountKop)));
}
