import { describe, expect, test } from 'vitest';
import { parseStatement, StatementError } from '@/lib/statement';
import { buildXlsx } from '../../helpers/xlsx';

const privat = [
  ['Історія операцій за період 27.09.2026 - 27.10.2026'],
  ['Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки', 'Валюта картки'],
  ['25.10.2026 22:45:22', 'Інтернет-магазини', '4149 **** **** 5143', 'Temu', -440.18, 'UAH'],
];
const mono = [
  ['Інформація по картці: 4441 **** **** 9314'],
  ['Рахунок: UA000000000000000000000001886'],
  ['Період: 01.10.2026 – 27.10.2026'],
  ['Дата i час операції', 'Деталі операції', 'MCC', 'Сума в валюті картки (UAH)'],
  ['27.10.2026 09:12:50', 'Переказ', 4829, -2666.25],
];

describe('parseStatement', () => {
  test('detects privat and mono from buildXlsx buffers regardless of filename', () => {
    expect(parseStatement(buildXlsx(privat), 'report_mono.xlsx').bank).toBe('privat');
    expect(parseStatement(buildXlsx(mono), 'privat.xlsx').bank).toBe('mono');
    const b = buildXlsx(mono);
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    expect(parseStatement(ab, 'x.xlsx').transactions).toHaveLength(1);
  });

  test('random xlsx → StatementError', () => {
    const buf = buildXlsx([['a', 'b'], [1, 2]]);
    expect(() => parseStatement(buf, 'x.xlsx')).toThrow(StatementError);
    expect(() => parseStatement(buf, 'x.xlsx')).toThrow(
      'Не удалось распознать выписку: это не Excel-выписка ПриватБанка или monobank',
    );
  });

  test('garbage bytes → StatementError', () => {
    expect(() => parseStatement(Buffer.from('not excel'), 'x.xlsx')).toThrow(StatementError);
  });

  test('.xls (bookType biff8) mono file parses', () => {
    const s = parseStatement(buildXlsx(mono, 'biff8'), 'report.xls');
    expect(s.bank).toBe('mono');
    expect(s.transactions[0]).toMatchObject({ occurredAt: '2026-10-27T09:12:50', amountKop: -266625 });
  });
});
