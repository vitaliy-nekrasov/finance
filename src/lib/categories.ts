import type { ParsedTransaction } from '@/lib/statement/types';

export type CategoryId =
  | 'groceries' | 'cafe' | 'transport' | 'utilities' | 'health' | 'entertainment' | 'digital'
  | 'shopping' | 'home' | 'services' | 'credit' | 'transfers' | 'cash' | 'income' | 'other';

export const CATEGORIES: Record<CategoryId, { name: string; emoji: string }> = {
  groceries: { name: 'Продукты', emoji: '🛒' },
  cafe: { name: 'Кафе и рестораны', emoji: '☕' },
  transport: { name: 'Транспорт и авто', emoji: '🚗' },
  utilities: { name: 'Коммунальные и связь', emoji: '💡' },
  health: { name: 'Здоровье', emoji: '💊' },
  entertainment: { name: 'Развлечения', emoji: '🎬' },
  digital: { name: 'Цифровые товары', emoji: '📱' },
  shopping: { name: 'Покупки', emoji: '🛍️' },
  home: { name: 'Дом и ремонт', emoji: '🏠' },
  services: { name: 'Услуги', emoji: '🧾' },
  credit: { name: 'Кредиты и рассрочка', emoji: '💳' },
  transfers: { name: 'Переводы людям', emoji: '👥' },
  cash: { name: 'Снятие наличных', emoji: '🏧' },
  income: { name: 'Поступления', emoji: '💰' },
  other: { name: 'Другое', emoji: '📦' },
};

export type Kind = 'expense' | 'income' | 'internal';

const PRIVAT: Record<string, CategoryId> = {
  'Супермаркети та продукти': 'groceries',
  'Ресторани, кафе, бари': 'cafe',
  'Інтернет-магазини': 'shopping',
  'Цифрові товари': 'digital',
  'Комуналка та Інтернет': 'utilities',
  'Розваги': 'entertainment',
  'Кіно': 'entertainment',
  'Послуги': 'services',
  'Дім та ремонт': 'home',
  'Кредити': 'credit',
  'Перекази': 'transfers',
  'Зарахування': 'income',
  'Зарахування переказу': 'income',
  'Зарахування зі своєї картки': 'income',
};

// [from, to, category] inclusive MCC ranges
const MCC_RANGES: [number, number, CategoryId][] = [
  [5411, 5412, 'groceries'], [5422, 5422, 'groceries'], [5441, 5441, 'groceries'],
  [5451, 5451, 'groceries'], [5462, 5462, 'groceries'], [5499, 5499, 'groceries'],
  [5811, 5814, 'cafe'],
  [4111, 4112, 'transport'], [4121, 4121, 'transport'], [4131, 4131, 'transport'],
  [4784, 4784, 'transport'], [5541, 5542, 'transport'], [7523, 7523, 'transport'],
  [7538, 7538, 'transport'], [7542, 7542, 'transport'],
  [4814, 4814, 'utilities'], [4899, 4900, 'utilities'],
  [5122, 5122, 'health'], [5912, 5912, 'health'], [8011, 8099, 'health'],
  [7832, 7832, 'entertainment'], [7841, 7841, 'entertainment'], [7922, 7922, 'entertainment'],
  [7991, 7999, 'entertainment'],
  [5815, 5818, 'digital'], [5734, 5734, 'digital'], [7372, 7372, 'digital'],
  [5200, 5261, 'home'], [5712, 5722, 'home'],
  [6010, 6011, 'cash'],
];

function fromMcc(mcc: number): CategoryId | null {
  for (const [from, to, cat] of MCC_RANGES) if (mcc >= from && mcc <= to) return cat;
  return null;
}

const fallback = (amountKop: number): CategoryId => (amountKop > 0 ? 'income' : 'other');

export function categorize(
  tx: Pick<ParsedTransaction, 'bank' | 'bankCategory' | 'mcc' | 'description' | 'amountKop'>,
): CategoryId {
  if (tx.bank === 'privat') {
    const cat = tx.bankCategory ? PRIVAT[tx.bankCategory] : undefined;
    return cat ?? fallback(tx.amountKop);
  }
  if (tx.mcc === 4829) {
    return tx.description.includes('частинами') || tx.description.includes('Щомісячний платіж')
      ? 'credit'
      : 'transfers';
  }
  const cat = tx.mcc === null ? null : fromMcc(tx.mcc);
  return cat ?? fallback(tx.amountKop);
}

export function classifyKind(amountKop: number, category: CategoryId): Exclude<Kind, 'internal'> {
  if (amountKop < 0) return 'expense';
  return category === 'income' || category === 'transfers' ? 'income' : 'expense';
}
