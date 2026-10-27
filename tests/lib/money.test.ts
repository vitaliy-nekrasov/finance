import { describe, it, expect } from 'vitest';
import { formatUAH, parseAmountToKop } from '@/lib/money';

describe('formatUAH', () => {
  it('formats with sign and no decimals', () => {
    expect(formatUAH(928000, { sign: true, decimals: 0 })).toBe('+9 280 ₴');
  });
  it('uses U+2212 for negatives', () => {
    expect(formatUAH(-5912000, { decimals: 0 })).toBe('−59 120 ₴');
  });
  it('auto shows kopecks when non-zero', () => {
    expect(formatUAH(-128450)).toBe('−1 284,50 ₴');
    expect(formatUAH(-128400)).toBe('−1 284 ₴');
  });
  it('zero has no sign', () => {
    expect(formatUAH(0, { sign: true })).toBe('0 ₴');
  });
});

describe('parseAmountToKop', () => {
  it('parses numbers and strings', () => {
    expect(parseAmountToKop(-440.18)).toBe(-44018);
    expect(parseAmountToKop('-1 249,95')).toBe(-124995);
    expect(parseAmountToKop('-1 249,95')).toBe(-124995);
    expect(parseAmountToKop('20700')).toBe(2070000);
  });
  it('returns null for non-numeric', () => {
    expect(parseAmountToKop('—')).toBeNull();
    expect(parseAmountToKop('-')).toBeNull();
    expect(parseAmountToKop('')).toBeNull();
    expect(parseAmountToKop(undefined)).toBeNull();
  });
  it('rounds float noise', () => {
    expect(parseAmountToKop(0.1 + 0.2)).toBe(30);
  });
});
