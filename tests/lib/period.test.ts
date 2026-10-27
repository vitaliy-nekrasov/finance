import { expect, test } from 'vitest';
import { neighbourChips, pct, prevMonth, resolvePeriod } from '@/lib/period';

test('out-of-range years are rejected', () => {
  expect(resolvePeriod({ month: '0000-05' }, '2026-10')!.month).toBe('2026-10');
  expect(resolvePeriod({ month: '3000-05' }, '2026-10')!.month).toBe('2026-10');
  expect(resolvePeriod({ from: '0000-01-01', to: '2026-01-02' }, '2026-10')!.month).toBe('2026-10');
  expect(resolvePeriod({ from: '2026-01-01', to: '9999-01-02' }, '2026-10')!.month).toBe('2026-10');
});

test('neighbourChips: +-2 around selected, edges, custom', () => {
  const all = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  expect(neighbourChips(all, '2026-07', '2026').map((c) => c.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
  expect(neighbourChips(all, '2026-05', '2026').map((c) => c.month)).toEqual(['2026-05', '2026-06', '2026-07']);
  expect(neighbourChips(all, '2026-10', '2026').map((c) => c.month)).toEqual(['2026-08', '2026-09', '2026-10']);
  expect(neighbourChips(all, null, '2026').map((c) => c.month)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
  expect(neighbourChips(['2025-12', '2026-01'], '2026-01', '2026').map((c) => c.label)).toEqual(['Дек 25', 'Янв']);
  expect(neighbourChips([], '2026-03', '2026').map((c) => c.month)).toEqual(['2026-03']);
});

test('pct', () => {
  expect(pct(100, 0)).toBe('—');
  expect(pct(104, 100)).toBe('+4%');
  expect(pct(94, 100)).toBe('−6%');
  expect(pct(100, 100)).toBe('0%');
});

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
