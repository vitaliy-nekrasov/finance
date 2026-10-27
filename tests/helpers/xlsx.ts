import * as XLSX from 'xlsx';

export function buildXlsx(rows: unknown[][], bookType: 'xlsx' | 'biff8' = 'xlsx'): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType }) as Buffer;
}
