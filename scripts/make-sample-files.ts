// Generates synthetic statements into ./samples (git-ignored) for manual testing of the upload screen.
// Usage: npx tsx scripts/make-sample-files.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildXlsx } from '../tests/helpers/xlsx';

const OUT = path.resolve(__dirname, '../samples');
mkdirSync(OUT, { recursive: true });

const PRIVAT_HEAD = [
  'Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки',
  'Валюта картки', 'Сума в валюті транзакції', 'Валюта транзакції',
  'Залишок на кінець періоду', 'Валюта залишку',
];
const CARD = '4149 **** **** 5143';
const p = (date: string, cat: string, desc: string, amount: number) =>
  [date, cat, CARD, desc, amount, 'UAH', Math.abs(amount), 'UAH', 1000, 'UAH'];

const privatRows = [
  ['Історія операцій за період 01.10.2026 - 27.10.2026'],
  PRIVAT_HEAD,
  p('26.10.2026 18:20:00', 'Супермаркети та продукти', 'Сільпо', -1284.5),
  p('25.10.2026 22:45:22', 'Інтернет-магазини', 'Temu', -440.18),
  p('24.10.2026 10:00:00', 'Зарахування', 'Зарплата', 45000),
  p('23.10.2026 09:10:00', 'Кафе та ресторани', 'Aroma Kava', -165),
  p('21.10.2026 19:00:00', 'Супермаркети та продукти', 'АТБ', -612.3),
  p('20.10.2026 12:30:00', 'Транспорт', 'Uklon', -142),
  p('15.10.2026 08:00:00', 'Комунальні послуги', 'Київстар', -250),
  p('10.10.2026 14:00:00', 'Перекази', 'Переказ на картку 4441 **** **** 9314', -5000),
];

const MONO_IBAN = 'UA000000000000000000000001886';
const monoHead = [
  ['Клієнт: Тест Тестович Тестов'],
  ['Інформація по картці: 4441 **** **** 9314'],
  [`Рахунок: ${MONO_IBAN}`],
  ['Період: 01.10.2026 – 27.10.2026'],
  [],
  [
    'Дата i час операції', 'Деталі операції', 'MCC', 'Сума в валюті картки (UAH)',
    'Сума в валюті операції', 'Валюта', 'Курс', 'Сума комісій (UAH)', 'Сума кешбеку (UAH)', 'Залишок після операції',
  ],
];
const m = (date: string, desc: string, mcc: number, amount: number) =>
  [date, desc, mcc, amount, Math.abs(amount), 'UAH', '—', '—', '—', 100];

const monoRows = [
  ...monoHead,
  m('27.10.2026 09:12:50', 'Novus', 5411, -2090.4),
  m('22.10.2026 13:00:00', 'Аптека АНЦ', 5912, -380),
  m('18.10.2026 20:15:00', 'Netflix', 4899, -299),
  m('12.10.2026 11:00:00', 'Варус', 5411, -455.7),
  m('10.10.2026 14:00:00', 'Переказ з картки', 4829, 5000),
];

writeFileSync(path.join(OUT, 'privat_oct.xlsx'), buildXlsx(privatRows));
writeFileSync(path.join(OUT, 'privat_oct_legacy.xls'), buildXlsx(privatRows, 'biff8'));
writeFileSync(path.join(OUT, 'mono_oct.xlsx'), buildXlsx(monoRows));
writeFileSync(path.join(OUT, 'garbage.xlsx'), buildXlsx([['hello'], ['world']]));
console.log(`Wrote sample files to ${OUT}`);
