import { describe, it, expect } from 'vitest';
import { CATEGORIES, categorize, classifyKind } from '@/lib/categories';

const tx = (o: Partial<Parameters<typeof categorize>[0]>) =>
  ({ bank: 'mono', bankCategory: null, mcc: null, description: '', amountKop: -100, ...o }) as Parameters<typeof categorize>[0];

describe('CATEGORIES', () => {
  it('has names and emoji', () => {
    expect(Object.keys(CATEGORIES)).toHaveLength(15);
    expect(CATEGORIES.groceries).toEqual({ name: 'Продукты', emoji: '🛒' });
    expect(CATEGORIES.shopping.emoji).toBe('🛍️');
  });
});

describe('categorize privat', () => {
  it('maps known categories', () => {
    expect(categorize(tx({ bank: 'privat', bankCategory: 'Супермаркети та продукти', description: 'Фора', amountKop: -7380 }))).toBe('groceries');
    expect(categorize(tx({ bank: 'privat', bankCategory: 'Зарахування зі своєї картки', amountKop: 7500000 }))).toBe('income');
    expect(categorize(tx({ bank: 'privat', bankCategory: 'Кредити' }))).toBe('credit');
    expect(categorize(tx({ bank: 'privat', bankCategory: 'Кіно' }))).toBe('entertainment');
  });
  it('unknown category', () => {
    expect(categorize(tx({ bank: 'privat', bankCategory: 'Нова категорія' }))).toBe('other');
    expect(categorize(tx({ bank: 'privat', bankCategory: 'Нова категорія', amountKop: 500 }))).toBe('income');
    expect(categorize(tx({ bank: 'privat', bankCategory: null }))).toBe('other');
  });
  it('Object.prototype keys fall back', () => {
    expect(categorize(tx({ bank: 'privat', bankCategory: 'constructor' }))).toBe('other');
    expect(categorize(tx({ bank: 'privat', bankCategory: 'toString', amountKop: 500 }))).toBe('income');
    expect(categorize(tx({ bank: 'privat', bankCategory: '__proto__' }))).toBe('other');
  });
});

describe('categorize mono', () => {
  it('4829', () => {
    expect(categorize(tx({ mcc: 4829, description: 'Щомісячний платіж з Оплати частинами', amountKop: -266625 }))).toBe('credit');
    expect(categorize(tx({ mcc: 4829, description: 'Юрій С.', amountKop: -14560 }))).toBe('transfers');
    expect(categorize(tx({ mcc: 4829, description: 'Юрій С.', amountKop: 14560 }))).toBe('transfers');
    expect(categorize(tx({ mcc: 4829, description: 'Оплата частинами', amountKop: 100 }))).toBe('credit');
  });
  it('mcc table', () => {
    const cases: [number, string][] = [
      [5411, 'groceries'], [5499, 'groceries'], [5812, 'cafe'], [5814, 'cafe'],
      [4111, 'transport'], [7542, 'transport'], [4814, 'utilities'], [4900, 'utilities'],
      [5912, 'health'], [8011, 'health'], [8099, 'health'], [7832, 'entertainment'], [7995, 'entertainment'],
      [5815, 'digital'], [5734, 'digital'], [7372, 'digital'], [5200, 'home'], [5261, 'home'], [5712, 'home'], [5722, 'home'],
      [6010, 'cash'], [6011, 'cash'],
    ];
    for (const [mcc, cat] of cases) expect(categorize(tx({ mcc }))).toBe(cat);
  });
  it('positive on expense mcc stays category (refund)', () => {
    expect(categorize(tx({ mcc: 5411, amountKop: 6900 }))).toBe('groceries');
  });
  it('fallbacks', () => {
    expect(categorize(tx({ mcc: 6012, description: 'Від: Test', amountKop: 2070000 }))).toBe('income');
    expect(categorize(tx({ mcc: 6012, amountKop: -100 }))).toBe('other');
    expect(categorize(tx({ mcc: 1234, amountKop: -100 }))).toBe('other');
    expect(categorize(tx({ mcc: 1234, amountKop: 100 }))).toBe('income');
    expect(categorize(tx({ mcc: null, amountKop: 100 }))).toBe('income');
    expect(categorize(tx({ mcc: 5411, description: 'Сільпо', amountKop: -128400 }))).toBe('groceries');
  });
});

describe('classifyKind', () => {
  it('works', () => {
    expect(classifyKind(-100, 'cafe')).toBe('expense');
    expect(classifyKind(6900, 'cafe')).toBe('expense');
    expect(classifyKind(55000, 'income')).toBe('income');
    expect(classifyKind(804699, 'transfers')).toBe('income');
    expect(classifyKind(-100, 'income')).toBe('expense');
  });
});
