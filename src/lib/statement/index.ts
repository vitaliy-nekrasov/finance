import * as XLSX from 'xlsx';
import { findHeader } from './cells';
import { findMonoHeader, parseMono } from './mono';
import { parsePrivat } from './privat';
import type { ParsedStatement, Rows } from './types';

export class StatementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatementError';
  }
}

const UNRECOGNIZED = 'Не удалось распознать выписку: это не Excel-выписка ПриватБанка или monobank';

export function parseStatement(file: Buffer | ArrayBuffer, _filename: string): ParsedStatement {
  let rows: Rows;
  try {
    const wb = XLSX.read(file, { type: file instanceof ArrayBuffer ? 'array' : 'buffer', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error('empty');
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as Rows;
  } catch {
    // Текст исходной ошибки не пробрасываем: в нём может оказаться содержимое файла.
    throw new StatementError(UNRECOGNIZED);
  }

  if (findMonoHeader(rows)) return parseMono(rows);
  if (findHeader(rows, ['Дата', 'Опис операції'])) return parsePrivat(rows);
  throw new StatementError(UNRECOGNIZED);
}
