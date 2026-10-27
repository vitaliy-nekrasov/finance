import { describe, expect, test } from 'vitest';
import * as XLSX from 'xlsx';
import { parseKyivDate } from '@/lib/statement/cells';
import { parsePrivat } from '@/lib/statement/privat';
import { buildXlsx } from '../../helpers/xlsx';

const TITLE = ['Історія операцій за період 27.09.2026 - 27.10.2026'];
const HEADER = [
  'Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки',
  'Валюта картки', 'Сума в валюті транзакції', 'Валюта транзакції',
  'Залишок на кінець періоду', 'Валюта залишку',
];
const r1 = ['25.10.2026 22:45:22', 'Інтернет-магазини', '4149 **** **** 5143', 'Temu', -440.18, 'UAH', 440.18, 'UAH', 1000, 'UAH'];
const r2 = ['24.10.2026 10:00:00', 'Зарахування', '4149 **** **** 5143', 'Зарплата', 25000, 'UAH', 25000, 'UAH', 25440.18, 'UAH'];
const r3 = ['23.10.2026 09:00:00', 'Супермаркети та продукти', '5168 **** **** 8181', 'Сільпо', '-1 234,56', 'UAH', 1234.56, 'UAH', 10, 'UAH'];
const rUsd = ['22.10.2026 09:00:00', 'Інтернет-магазини', '4149 **** **** 5143', 'AWS', -10, 'USD', 10, 'USD', 1, 'USD'];

describe('parseKyivDate', () => {
  test('parseKyivDate', () => {
    expect(parseKyivDate('25.10.2026 22:45:22')).toBe('2026-10-25T22:45:22');
    expect(parseKyivDate(new Date(2026, 9, 25, 22, 45, 22))).toBe('2026-10-25T22:45:22');
    expect(parseKyivDate('мусор')).toBeNull();
    expect(parseKyivDate(null)).toBeNull();
  });
});

describe('parsePrivat', () => {
  test('parses rows, sign, category, card', () => {
    const s = parsePrivat([TITLE, HEADER, r1, r2]);
    expect(s.bank).toBe('privat');
    expect(s.period).toEqual({ from: '2026-09-27', to: '2026-10-27' });
    expect(s.transactions[0]).toEqual({
      bank: 'privat', accountKey: '4149****5143', occurredAt: '2026-10-25T22:45:22',
      amountKop: -44018, description: 'Temu', bankCategory: 'Інтернет-магазини', mcc: null,
    });
    expect(s.transactions[1].amountKop).toBe(2500000);
    expect(s.accounts).toEqual([{ key: '4149****5143', bank: 'privat', label: 'Приват *5143', last4: ['5143'] }]);
  });

  test('several cards in one file → several accounts', () => {
    const s = parsePrivat([TITLE, HEADER, r1, r3]);
    expect(s.accounts.map((a) => a.key)).toEqual(['4149****5143', '5168****8181']);
    expect(s.transactions[1].amountKop).toBe(-123456);
  });

  test('row with Валюта картки = USD is skipped with warning', () => {
    const s = parsePrivat([TITLE, HEADER, r1, rUsd, r2]);
    expect(s.transactions).toHaveLength(2);
    expect(s.warnings[0]).toMatch(/валют/i);
  });

  test('empty trailing rows ignored; header located by name not by index', () => {
    const s = parsePrivat([TITLE, [], ['мусор'], HEADER, r1, [], [null, null], ['', '']]);
    expect(s.transactions).toHaveLength(1);
    expect(s.warnings).toEqual([]);
  });

  test('rows without valid date or amount are skipped', () => {
    const bad = ['нет даты', 'X', '4149 **** **** 5143', 'Y', -1, 'UAH'];
    const noAmt = ['25.10.2026 22:45:22', 'X', '4149 **** **** 5143', 'Y', null, 'UAH'];
    const s = parsePrivat([TITLE, HEADER, bad, noAmt, r1]);
    expect(s.transactions).toHaveLength(1);
  });

  test('works on rows read from a real xlsx buffer', () => {
    const wb = XLSX.read(buildXlsx([TITLE, HEADER, r1]), { type: 'buffer', cellDates: true });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
    expect(parsePrivat(rows).transactions[0].amountKop).toBe(-44018);
  });
});
