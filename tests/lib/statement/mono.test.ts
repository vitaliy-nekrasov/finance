import { describe, expect, test } from 'vitest';
import { parseMono } from '@/lib/statement/mono';
import { parsePrivat } from '@/lib/statement/privat';

const IBAN = 'UA000000000000000000000001886';
const HEAD = [
  ['Клієнт: Тест Тестович Тестов'],
  ['Дата народження: 01.01.1990'],
  ['ІПН: 1234567890'],
  ['Серія/номер паспорту: АА 000000'],
  ['Адреса реєстрації: м. Київ, вул. Тестова 1'],
  ['Інформація по картці: 4441 **** **** 9314, 4441 **** **** 5301'],
  [`Рахунок: ${IBAN}`],
  ['Період: 01.10.2026 – 27.10.2026'],
  [],
  [null, null],
];
const th = (cur = 'UAH') => [
  'Дата i час операції', 'Деталі операції', 'MCC', `Сума в валюті картки (${cur})`,
  'Сума в валюті операції', 'Валюта', 'Курс', `Сума комісій (${cur})`, `Сума кешбеку (${cur})`, 'Залишок після операції',
];
const t1 = ['27.10.2026 09:12:50', 'Переказ на картку', 4829, -2666.25, 2666.25, 'UAH', '—', '—', '—', 100];
const t2 = ['26.10.2026 12:00:00', 'Сільпо', 5411, '-1 249,95', '—', 'UAH', '—', '—', '—', 100];
const rows = [...HEAD, th(), t1, t2];

describe('parseMono', () => {
  test('parses mono', () => {
    const s = parseMono(rows);
    expect(s.accounts).toEqual([{ key: IBAN, bank: 'mono', label: 'Моно *9314, *5301', last4: ['9314', '5301'] }]);
    expect(s.period).toEqual({ from: '2026-10-01', to: '2026-10-27' });
    expect(s.transactions[0]).toMatchObject({
      accountKey: IBAN, occurredAt: '2026-10-27T09:12:50', amountKop: -266625, mcc: 4829, bankCategory: null,
    });
  });

  test('header with one card and table at another row index parses the same', () => {
    const other = [
      ['Інформація по картці: 4441 **** **** 9314'], [`Рахунок: ${IBAN}`], ['Період: 01.10.2026 – 27.10.2026'],
      th(), t1,
    ];
    const s = parseMono(other);
    expect(s.accounts[0].label).toBe('Моно *9314');
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0].amountKop).toBe(-266625);
  });

  test('decomposed Unicode (і + U+0308 for «ї») in header and text parses', () => {
    const nfd = (r: unknown[]) => r.map((c) => (typeof c === 'string' ? c.normalize('NFD') : c));
    const s = parseMono([...HEAD.map(nfd), nfd(th()), nfd(['27.10.2026 09:12:50', 'Поповнення «Київстар»', 4829, -156, 156, 'UAH', '—', '6', '—', 100])]);
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0].description).toBe('Поповнення «Київстар»'.normalize('NFC'));
    expect(s.accounts[0].key).toBe(IBAN);
  });

  test('"—" cells and string amounts parse', () => {
    const s = parseMono([...HEAD, th(), t2]);
    expect(s.transactions[0]).toMatchObject({ amountKop: -124995, mcc: 5411 });
    const dash = parseMono([...HEAD, th(), ['26.10.2026 12:00:00', '—', '—', -5, '—', '—', '—', '—', '—', '—']]);
    expect(dash.transactions[0]).toMatchObject({ mcc: null, amountKop: -500, description: '' });
  });

  test('no PII in output', () => {
    const s = parseMono(rows);
    const json = JSON.stringify(s);
    for (const pii of ['Тестович', '1234567890', 'АА 000000', '01.01.1990', 'Адреса', 'Київ', 'Клієнт']) {
      expect(json).not.toContain(pii);
    }
    expect(Object.keys(s).sort()).toEqual(['accounts', 'bank', 'period', 'transactions', 'warnings']);
    expect(s.warnings).toEqual([]);
  });

  test('table currency not UAH → no transactions, warning', () => {
    const s = parseMono([...HEAD, th('USD'), t1]);
    expect(s.transactions).toEqual([]);
    expect(s.warnings.length).toBeGreaterThan(0);
  });

  test('unparsable rows are counted in a warning', () => {
    const bad = ['не дата', 'x', 1, 'abc', null, null, null, null, null, null];
    const s = parseMono([...HEAD, th(), t1, bad, bad]);
    expect(s.transactions).toHaveLength(1);
    expect(s.warnings).toContain('Пропущено 2 строк, которые не удалось разобрать');
  });
});

describe('parsePrivat skipped rows', () => {
  test('unparsable rows are counted in a warning', () => {
    const header = ['Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки', 'Валюта картки'];
    const ok = ['25.10.2026 22:45:22', 'X', '4149 **** **** 5143', 'Temu', -1, 'UAH'];
    const bad = ['мусор', 'X', '4149 **** **** 5143', 'Temu', 'abc', 'UAH'];
    const s = parsePrivat([['t'], header, ok, bad]);
    expect(s.warnings).toContain('Пропущено 1 строк, которые не удалось разобрать');
  });
});
