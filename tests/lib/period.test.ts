import { expect, test } from 'vitest';
import { prevMonth, resolvePeriod } from '@/lib/period';

test('defaults to latest month', () => {
  expect(resolvePeriod({}, '2026-10')).toEqual({
    range: { from: '2026-10-01', to: '2026-10-31' },
    label: 'Октябрь 2026',
    month: '2026-10',
  });
});

test('month end handles February', () => {
  expect(resolvePeriod({ month: '2026-02' }, '2026-10')!.range.to).toBe('2026-02-28');
  expect(resolvePeriod({ month: '2028-02' }, '2026-10')!.range.to).toBe('2028-02-29');
});

test('custom range label', () => {
  const r = resolvePeriod({ from: '2026-10-01', to: '2026-10-15' }, null)!;
  expect(r.label).toBe('1 окт – 15 окт 2026');
  expect(r.month).toBeNull();
});

test('custom range across years and swapped bounds', () => {
  expect(resolvePeriod({ from: '2025-12-28', to: '2026-01-03' }, null)!.label).toBe('28 дек 2025 – 3 янв 2026');
  expect(resolvePeriod({ from: '2026-10-15', to: '2026-10-01' }, null)!.range).toEqual({
    from: '2026-10-01',
    to: '2026-10-15',
  });
});

test('garbage falls back to latest month; invalid dates ignored', () => {
  expect(resolvePeriod({ month: 'garbage' }, '2026-10')!.month).toBe('2026-10');
  expect(resolvePeriod({ month: '2026-13' }, '2026-10')!.month).toBe('2026-10');
  expect(resolvePeriod({ from: '2026-02-31', to: '2026-03-01' }, '2026-10')!.month).toBe('2026-10');
});

test('no data and no params -> null', () => {
  expect(resolvePeriod({}, null)).toBeNull();
});

test('prevMonth', () => {
  expect(prevMonth('2026-01')).toBe('2025-12');
  expect(prevMonth('2026-10')).toBe('2026-09');
});
