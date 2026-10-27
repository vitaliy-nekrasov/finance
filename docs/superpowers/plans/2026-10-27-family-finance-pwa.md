# Семейные финансы PWA — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA на Next.js: загрузка Excel-выписок ПриватБанка и monobank, общий семейный отчёт по категориям, доходам, расходам и итогу месяца, вход по паролю, стиль «Тёмное стекло».

**Architecture:** Вся доменная логика — чистые функции в `src/lib`: разбор выписок, категории, ключи дублей, поиск переводов между своими. Она покрыта Vitest. Слой БД (`src/db`) — Drizzle поверх Postgres: Neon в проде, PGlite в тестах. UI — серверные компоненты App Router, которые читают БД напрямую. Загрузка идёт через route handler, вход, выход и удаление — через server actions. Доступ закрывает middleware с подписанной JWT-cookie.

**Tech Stack:** Next.js (App Router, последняя стабильная), TypeScript strict, Tailwind CSS v4, `motion` (бывший framer-motion), SheetJS (`xlsx` из cdn.sheetjs.com), Drizzle ORM + `@neondatabase/serverless`, `@electric-sql/pglite` (тесты), `jose` (JWT), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-family-finance-pwa-design.md` — прочитать целиком перед началом. В нём точные колонки выписок и решения по продукту.

## Global Constraints

- Интерфейс на русском, валюта ₴. Деньги хранятся как целые копейки (`amountKop: number`), никаких float в расчётах.
- Время операций — «настенное» время Киева из выписки. В БД это `timestamp without time zone`, без конвертаций в UTC. Месяц операции — `YYYY-MM` из этого времени.
- Из шапки выписки monobank сохраняются **только** маски карт, IBAN и период. Паспорт, ИПН, дата рождения, адрес, имя клиента нигде не сохраняются и не логируются (включая `console.log` и тексты ошибок).
- Исходные файлы не сохраняются ни на диск, ни в БД.
- Пароль проверяется только на сервере. Логин и хэш берутся из env `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, секрет сессии — из `SESSION_SECRET`. Ни один из них не попадает в клиентский бандл (никаких `NEXT_PUBLIC_`).
- Сессия — httpOnly, Secure, SameSite=Lax cookie `session`, срок 90 дней.
- Только тёмная тема. Цвета: фон `#07070d`, пятна `#7c3aed` и `#06b6d4`, градиент главной цифры `#a7f3d0 → #67e8f9`, полосы категорий `#8b5cf6 → #06b6d4`, стекло — `rgba(255,255,255,.07)` с рамкой `rgba(255,255,255,.12)`, `backdrop-blur`, радиус ~20px. Все анимации отключаются при `prefers-reduced-motion`.
- Владельца операций («Виталий / Жена») нет нигде: ни в схеме, ни в UI.
- Счета в валюте, отличной от UAH, пропускаются с предупреждением.

## Review Focus

1. **Две одинаковые операции в одной выписке** (то же время, сумма и описание, например две оплаты в кафе подряд): обе сохраняются, а повторная загрузка того же файла не добавляет ничего. Тест в Task 5.
2. **Повторная и пересекающаяся загрузка** (тот же файл дважды; сентябрь–октябрь поверх октября): новых операций 0 и N соответственно, итоги не меняются. Тест в Task 6.
3. **Вторая сторона перевода приходит позже:** после загрузки выписки Моно перевод с Привата, который до этого был расходом, становится внутренним. Если удалить эту загрузку, он снова становится расходом. Тест в Task 6.
4. **Шапка Моно другой длины** (одна карта вместо двух, таблица не на строке 22), ячейки «—», суммы как числа или как строки `-1 249,95`, даты как Excel-даты или строки. Всё парсится. Тест в Task 3.
5. **Запросы без входа:** `POST /api/upload` без cookie получает 401 JSON, страница `/` редиректит на `/login`, а поддельная или просроченная cookie отклоняется. Тест в Task 7.

---

## Структура файлов

```
src/
  lib/
    money.ts              formatUAH, parseAmountToKop
    statement/
      types.ts            ParsedStatement, ParsedTransaction, Bank
      cells.ts            parseKyivDate, cell helpers
      privat.ts           parsePrivat(rows)
      mono.ts             parseMono(rows)
      index.ts            parseStatement(buffer, filename)
    categories.ts         CATEGORIES, categorize, classifyKind
    dedup.ts              withDedupKeys
    internal.ts           findInternalTransfers
    auth/
      password.ts         hashPassword, verifyPassword
      session.ts          createSessionToken, verifySessionToken
  db/
    schema.ts             drizzle-таблицы
    client.ts             getDb() для Neon
    repo.ts               ingestStatement, deleteUpload, recomputeInternal
    reports.ts            getReport, getMonthly, getTransactions, getLatestMonth, listUploads
  middleware.ts
  app/
    layout.tsx, globals.css, manifest.ts, icon.tsx, apple-icon.tsx
    login/page.tsx, login/actions.ts
    (app)/layout.tsx      AppShell: фон, нижние вкладки
    (app)/page.tsx        Обзор
    (app)/category/[id]/page.tsx
    (app)/upload/page.tsx, (app)/upload/actions.ts
    (app)/transactions/page.tsx
    api/upload/route.ts
  components/             Glass, AnimatedNumber, CategoryBars, MonthlyBars, PeriodPicker, TabBar, Dropzone, TxList
tests/
  helpers/xlsx.ts         buildXlsx(rows) — фикстуры генерируются в коде, бинарников в репо нет
  helpers/db.ts           createTestDb() на PGlite + миграции
scripts/hash-password.ts
drizzle/                  сгенерированные миграции
```

---

### Task 1: Каркас проекта и деньги

**Files:**
- Create: Next.js-проект в корне репозитория, `vitest.config.ts`, `src/lib/money.ts`
- Test: `tests/lib/money.test.ts`

**Interfaces:**
- Produces: `formatUAH(kop: number, opts?: { sign?: boolean; decimals?: 'auto' | 0 }): string`, `parseAmountToKop(v: unknown): number | null`

- [ ] **Step 1: Создать проект.** `npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm`. Если команда откажется из-за существующих файлов (`docs/`, `test.md`, `.gitignore`), создать проект во временной папке и перенести всё в корень. В `.gitignore` должна остаться строка `.superpowers/`, а `test.md` не трогать. Затем: `npm i motion jose drizzle-orm @neondatabase/serverless https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` и `npm i -D vitest @electric-sql/pglite drizzle-kit tsx`. Добавить скрипт `"test": "vitest run"`, Vitest с `environment: 'node'` и алиасом `@` → `src`.

- [ ] **Step 2: Написать падающий тест**

```ts
// tests/lib/money.test.ts
expect(formatUAH(928000, { sign: true, decimals: 0 })).toBe('+9 280 ₴');
expect(formatUAH(-5912000, { decimals: 0 })).toBe('−59 120 ₴'); // U+2212
expect(formatUAH(-128450)).toBe('−1 284,50 ₴');  // auto: копейки, если не ноль
expect(formatUAH(-128400)).toBe('−1 284 ₴');
expect(formatUAH(0, { sign: true })).toBe('0 ₴');
expect(parseAmountToKop(-440.18)).toBe(-44018);
expect(parseAmountToKop('-1 249,95')).toBe(-124995);
expect(parseAmountToKop('-1 249,95')).toBe(-124995);
expect(parseAmountToKop('20700')).toBe(2070000);
expect(parseAmountToKop('—')).toBeNull();
expect(parseAmountToKop('')).toBeNull();
expect(parseAmountToKop(0.1 + 0.2)).toBe(30); // округление, не 30.000000004
```

- [ ] **Step 3: Запустить** `npm test` → FAIL (модуль не найден).
- [ ] **Step 4: Реализовать `src/lib/money.ts`.** Разделитель тысяч и пробел перед ₴ — U+00A0, минус — U+2212. `parseAmountToKop` убирает пробелы и NBSP, меняет `,` на `.`, а `—`, `-` без цифр и пустую строку возвращает как `null`. Результат `Math.round(n * 100)`.
- [ ] **Step 5: Запустить** `npm test` → PASS; `npm run build` → успешно.
- [ ] **Step 6: Commit** `feat: scaffold Next.js app and money utils`

---

### Task 2: Парсер ПриватБанка

**Files:**
- Create: `src/lib/statement/types.ts`, `src/lib/statement/cells.ts`, `src/lib/statement/privat.ts`, `tests/helpers/xlsx.ts`
- Test: `tests/lib/statement/privat.test.ts`

**Interfaces:**
- Consumes: `parseAmountToKop` (Task 1)
- Produces:
```ts
type Bank = 'privat' | 'mono';
interface ParsedTransaction {
  bank: Bank;
  accountKey: string;        // Приват: '4149****5143'; Моно: IBAN
  occurredAt: string;        // 'YYYY-MM-DDTHH:mm:ss', киевское время
  amountKop: number;         // со знаком, в валюте карты (UAH)
  description: string;
  bankCategory: string | null; // Приват: 'Категорія'; Моно: null
  mcc: number | null;          // Моно: MCC; Приват: null
}
interface ParsedAccount { key: string; bank: Bank; label: string; last4: string[] }
interface ParsedStatement {
  bank: Bank;
  accounts: ParsedAccount[];
  period: { from: string; to: string } | null; // 'YYYY-MM-DD'
  transactions: ParsedTransaction[];
  warnings: string[];         // по-русски, для экрана загрузки
}
type Rows = unknown[][];      // результат XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
parseKyivDate(v: unknown): string | null   // cells.ts
parsePrivat(rows: Rows): ParsedStatement   // privat.ts
buildXlsx(rows: unknown[][]): Buffer       // tests/helpers/xlsx.ts, XLSX.write(..., { type: 'buffer', bookType: 'xlsx' })
```

- [ ] **Step 1: Написать падающие тесты.** Фикстура — строки как на скриншоте из спеки: строка 1 `['Історія операцій за період 27.09.2026 - 27.10.2026']`, строка 2 — шапка из 10 колонок, затем операции.

```ts
test('parseKyivDate', () => {
  expect(parseKyivDate('25.10.2026 22:45:22')).toBe('2026-10-25T22:45:22');
  expect(parseKyivDate(new Date(2026, 9, 25, 22, 45, 22))).toBe('2026-10-25T22:45:22'); // ячейка-дата SheetJS (cellDates)
  expect(parseKyivDate('мусор')).toBeNull();
});
test('parses rows, sign, category, card', () => {
  const s = parsePrivat(rows);
  expect(s.bank).toBe('privat');
  expect(s.period).toEqual({ from: '2026-09-27', to: '2026-10-27' });
  expect(s.transactions[0]).toEqual({
    bank: 'privat', accountKey: '4149****5143', occurredAt: '2026-10-25T22:45:22',
    amountKop: -44018, description: 'Temu', bankCategory: 'Інтернет-магазини', mcc: null,
  });
  expect(s.accounts).toEqual([{ key: '4149****5143', bank: 'privat', label: 'Приват *5143', last4: ['5143'] }]);
});
test('several cards in one file → several accounts');
test('row with Валюта картки = USD is skipped with warning', () => {
  expect(s.transactions).toHaveLength(N - 1);
  expect(s.warnings[0]).toMatch(/валют/i);
});
test('empty trailing rows ignored; header located by "Дата" + "Опис операції" not by index');
```

- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать.** Шапку искать как первую строку, где есть ячейки `Дата` и `Опис операції`. Колонки сопоставлять по названию, а не по позиции. Маска карты нормализуется удалением пробелов. Период берётся из первой строки регуляркой `(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})`. Строки без валидной даты или суммы пропускаются. Чтение файла через SheetJS — в Task 3, здесь функция принимает `Rows`.
- [ ] **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat: parse PrivatBank Excel statements`

---

### Task 3: Парсер monobank и общий вход

**Files:**
- Create: `src/lib/statement/mono.ts`, `src/lib/statement/index.ts`
- Test: `tests/lib/statement/mono.test.ts`, `tests/lib/statement/index.test.ts`

**Interfaces:**
- Consumes: типы и `parseKyivDate` (Task 2), `buildXlsx`
- Produces: `parseMono(rows: Rows): ParsedStatement`; `parseStatement(file: Buffer | ArrayBuffer, filename: string): ParsedStatement` — бросает `StatementError` (`class StatementError extends Error`) с русским сообщением `'Не удалось распознать выписку: это не Excel-выписка ПриватБанка или monobank'`.

- [ ] **Step 1: Написать падающие тесты.** Фикстура повторяет скриншот: `Клієнт: Тест Тестович Тестов`, `Дата народження: 01.01.1990`, `ІПН: 1234567890`, `Серія/номер паспорту: АА 000000`, `Адреса реєстрації: …`, `Інформація по картці: 4441 **** **** 9314, 4441 **** **** 5301`, `Рахунок: UA000000000000000000000001886`, `Період: 01.10.2026 – 27.10.2026` (en dash), пустые строки, шапка таблицы и операции.

```ts
test('parses mono', () => {
  const s = parseMono(rows);
  expect(s.accounts).toEqual([{ key: 'UA000000000000000000000001886', bank: 'mono',
    label: 'Моно *9314, *5301', last4: ['9314', '5301'] }]);
  expect(s.period).toEqual({ from: '2026-10-01', to: '2026-10-27' });
  expect(s.transactions[0]).toMatchObject({ accountKey: 'UA000000000000000000000001886',
    occurredAt: '2026-10-27T09:12:50', amountKop: -266625, mcc: 4829, bankCategory: null });
});
test('header with one card and table at another row index parses the same');
test('"—" cells and string amounts "-1 249,95" parse');
test('no PII in output', () => {
  const json = JSON.stringify(parseMono(rows));
  for (const pii of ['Тестович', '1234567890', 'АА 000000', '01.01.1990', 'Адреса']) expect(json).not.toContain(pii);
});
test('table currency not UAH → no transactions, warning');
// index.test.ts
test('detects privat and mono from buildXlsx buffers regardless of filename');
test('random xlsx → StatementError');
test('.xls (bookType biff8) mono file parses');
```

- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать.** Шапку таблицы Моно искать по ячейкам `Дата i час операції` и `MCC` (сравнивать без учёта регистра и `i`/`і`). Валюта карты берётся из заголовка колонки `Сума в валюті картки (XXX)`. Из строк над таблицей читаются только строки с префиксами `Інформація по картці`, `Рахунок`, `Період`, остальные не трогаются. В `parseStatement` нужно `XLSX.read(buf, { cellDates: true })`, первый лист, `sheet_to_json(..., { header: 1, raw: true, defval: null })`. Банк определяется по наличию шапки Привата или Моно.
- [ ] **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat: parse monobank Excel statements, detect bank`

---

### Task 4: Категории и тип операции

**Files:**
- Create: `src/lib/categories.ts`
- Test: `tests/lib/categories.test.ts`

**Interfaces:**
- Consumes: `ParsedTransaction`
- Produces:
```ts
type CategoryId = 'groceries'|'cafe'|'transport'|'utilities'|'health'|'entertainment'|'digital'
  |'shopping'|'home'|'services'|'credit'|'transfers'|'cash'|'income'|'other';
const CATEGORIES: Record<CategoryId, { name: string; emoji: string }>;
categorize(tx: Pick<ParsedTransaction,'bank'|'bankCategory'|'mcc'|'description'|'amountKop'>): CategoryId
type Kind = 'expense' | 'income' | 'internal';
classifyKind(amountKop: number, category: CategoryId): Exclude<Kind,'internal'>
```

Названия и эмодзи: Продукты 🛒, Кафе и рестораны ☕, Транспорт и авто 🚗, Коммунальные и связь 💡, Здоровье 💊, Развлечения 🎬, Цифровые товары 📱, Покупки 🛍️, Дом и ремонт 🏠, Услуги 🧾, Кредиты и рассрочка 💳, Переводы людям 👥, Снятие наличных 🏧, Поступления 💰, Другое 📦.

Приват → категория: Супермаркети та продукти→groceries; Ресторани, кафе, бари→cafe; Інтернет-магазини→shopping; Цифрові товари→digital; Комуналка та Інтернет→utilities; Розваги, Кіно→entertainment; Послуги→services; Дім та ремонт→home; Кредити→credit; Перекази→transfers; Зарахування, Зарахування переказу, Зарахування зі своєї картки→income; остальное→other. Неизвестную категорию с положительной суммой отправлять в income.

Моно → по MCC (исполнитель расширяет таблицу стандартными диапазонами MCC): 5411, 5412, 5422, 5441, 5451, 5462, 5499→groceries; 5812–5814→cafe; 4111, 4121, 4131, 4784, 5541, 5542, 7523, 7538, 7542→transport; 4814, 4899, 4900→utilities; 5912, 5122, 8011–8099→health; 7832, 7841, 7922, 7991–7999→entertainment; 5815–5818, 5734, 7372→digital; 5200–5261, 5712–5722→home; 6010, 6011→cash; 4829: если описание содержит `частинами` или `Щомісячний платіж`, то credit, иначе transfers; 6012 и любой MCC с положительной суммой без расходной категории→income.

Правило `classifyKind`: сумма < 0 → `expense`. Сумма > 0 и категория расходная (не `income`/`transfers`) → `expense` (возврат уменьшает расход категории). Иначе → `income`.

- [ ] **Step 1: Написать падающие тесты**

```ts
expect(categorize({ bank:'privat', bankCategory:'Супермаркети та продукти', mcc:null, description:'Фора', amountKop:-7380 })).toBe('groceries');
expect(categorize({ bank:'privat', bankCategory:'Зарахування зі своєї картки', mcc:null, description:'Зі своєї картки *8181', amountKop:7500000 })).toBe('income');
expect(categorize({ bank:'privat', bankCategory:'Нова категорія', mcc:null, description:'x', amountKop:-100 })).toBe('other');
expect(categorize({ bank:'mono', bankCategory:null, mcc:4829, description:'Щомісячний платіж з Оплати частинами', amountKop:-266625 })).toBe('credit');
expect(categorize({ bank:'mono', bankCategory:null, mcc:4829, description:'Юрій С.', amountKop:-14560 })).toBe('transfers');
expect(categorize({ bank:'mono', bankCategory:null, mcc:5411, description:'Сільпо', amountKop:-128400 })).toBe('groceries');
expect(categorize({ bank:'mono', bankCategory:null, mcc:6012, description:'Від: Test', amountKop:2070000 })).toBe('income');
expect(classifyKind(-100, 'cafe')).toBe('expense');
expect(classifyKind(6900, 'cafe')).toBe('expense');      // возврат
expect(classifyKind(55000, 'income')).toBe('income');
expect(classifyKind(804699, 'transfers')).toBe('income'); // входящий перевод
```

- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать.** **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat: unified categories and kind classification`

---

### Task 5: Ключи дублей и переводы между своими

**Files:**
- Create: `src/lib/dedup.ts`, `src/lib/internal.ts`
- Test: `tests/lib/dedup.test.ts`, `tests/lib/internal.test.ts`

**Interfaces:**
- Produces:
```ts
withDedupKeys<T extends ParsedTransaction>(txs: T[]): (T & { dedupKey: string })[]
interface InternalCandidate { id: number; accountKey: string; occurredAt: string; amountKop: number;
  description: string; bankCategory: string | null }
findInternalTransfers(txs: InternalCandidate[]): Set<number>   // id внутренних операций
```

`dedupKey` = sha256 hex от `bank|accountKey|occurredAt|amountKop|description|n`. `n` — порядковый номер среди операций с одинаковым остальным кортежем внутри одной выписки (0, 1, …). Поэтому одинаковые операции не схлопываются, а повторная загрузка даёт те же ключи.

`findInternalTransfers` работает так:
1. По маркеру: `bankCategory === 'Зарахування зі своєї картки'` или описание по `/(на|зі|з) сво(єї|ю) картк/i` → внутренняя.
2. По паре: списание и зачисление с `|amount|` равными, **разными** `accountKey`, `|Δt| ≤ 48ч`. Каждая операция участвует максимум в одной паре. Пары подбираются жадно, начиная с наименьшего `|Δt|`. Обе операции пары → внутренние.

- [ ] **Step 1: Написать падающие тесты**

```ts
test('identical ops in one statement get distinct keys, stable across runs', () => {
  const a = withDedupKeys([t1, t1copy]); const b = withDedupKeys([t1, t1copy]);
  expect(a[0].dedupKey).not.toBe(a[1].dedupKey);
  expect(a.map(x=>x.dedupKey)).toEqual(b.map(x=>x.dedupKey));
});
test('pair across accounts within 48h → both internal');
test('same amount on same account → not internal');
test('gap 3 days → not internal');
test('one debit, two equal credits → only the closest in time is paired');
test('Privat "Зарахування зі своєї картки" without counterpart → internal by marker');
test('lonely outgoing transfer to unknown card → not internal');
```

- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать** (`node:crypto` для sha256). **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat: dedup keys and internal transfer detection`

---

### Task 6: База данных, загрузка в БД и отчёты

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/db/repo.ts`, `src/db/reports.ts`, `drizzle.config.ts`, `drizzle/*` (через `npx drizzle-kit generate`), `tests/helpers/db.ts`
- Test: `tests/db/repo.test.ts`, `tests/db/reports.test.ts`

**Interfaces:**
- Consumes: `ParsedStatement` (2–3), `categorize`, `classifyKind` (4), `withDedupKeys`, `findInternalTransfers` (5)
- Produces:
```ts
type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
getDb(): Db                         // client.ts: drizzle(neon-serverless Pool(DATABASE_URL)), синглтон
createTestDb(): Promise<Db>         // PGlite in-memory + migrate('./drizzle')
interface IngestResult { uploadId: number; bank: Bank; total: number; added: number; duplicates: number;
  internalFound: number; warnings: string[] }
ingestStatement(db: Db, s: ParsedStatement, filename: string): Promise<IngestResult>
deleteUpload(db: Db, uploadId: number): Promise<void>
recomputeInternal(db: Db): Promise<number>      // число внутренних после пересчёта
interface Range { from: string; to: string }    // 'YYYY-MM-DD' включительно
getReport(db, r: Range): Promise<{ incomeKop: number; expenseKop: number; netKop: number;
  byCategory: { category: CategoryId; amountKop: number; count: number }[] }>  // byCategory по убыванию, amount > 0 = потрачено
getMonthly(db, toMonth: string, months: number): Promise<{ month: string; incomeKop: number; expenseKop: number; netKop: number }[]>
getTransactions(db, r: Range, f?: { category?: CategoryId; q?: string }): Promise<TxRow[]>
type TxRow = { id: number; occurredAt: string; amountKop: number; description: string; category: CategoryId;
  kind: Kind; bank: Bank; last4: string | null }
getLatestMonth(db): Promise<string | null>     // 'YYYY-MM'
listUploads(db): Promise<{ id: number; filename: string; bank: Bank; uploadedAt: Date;
  periodFrom: string | null; periodTo: string | null; added: number }[]>
```

Схема:
- `uploads(id serial pk, filename text, bank text, uploaded_at timestamptz default now(), period_from date null, period_to date null, total int, added int, duplicates int)`
- `accounts(key text pk, bank text, label text, last4 text[])`, upsert при загрузке
- `transactions(id serial pk, dedup_key text unique, upload_id int fk → uploads on delete cascade, bank text, account_key text, occurred_at timestamp, amount_kop bigint mode:'number', description text, bank_category text null, mcc int null, category text, kind text)`, индекс по `occurred_at`
- `login_attempts(id serial pk, ip text, at timestamptz default now())`

Логика `ingestStatement` (в одной транзакции): создать upload → upsert accounts → `withDedupKeys` → `insert … on conflict (dedup_key) do nothing returning id` → `kind = classifyKind(...)` → `recomputeInternal` → обновить счётчики upload. `internalFound` — сколько операций **этой загрузки** стали `internal`. `recomputeInternal` загружает все операции, сбрасывает `internal` в `classifyKind` и проставляет `internal` по `findInternalTransfers`. Данных мало (тысячи строк), поэтому пересчитывать всё целиком нормально. `deleteUpload` удаляет загрузку (каскадно её операции) и вызывает `recomputeInternal`. `getReport` и `getMonthly` не учитывают `kind='internal'`. Расход категории — `-sum(amount_kop)` по `kind='expense'`, так что возвраты уменьшают его.

- [ ] **Step 1: Создать schema, сгенерировать миграцию** `npx drizzle-kit generate` → в `drizzle/` появился SQL.
- [ ] **Step 2: Написать падающие тесты** (каждый на свежей `createTestDb()`, выписки строятся объектами `ParsedStatement`):

```ts
test('same statement twice → second: added 0, duplicates N; report unchanged');
test('overlapping Sep–Oct over Oct → only September rows added');
test('privat −75000 ₴ alone counts as expense; after mono +75000 ₴ upload both internal; report excludes them', async () => {
  // после второй загрузки
  expect((await getReport(db, oct)).expenseKop).toBe(expenseWithoutTransfer);
  expect(res2.internalFound).toBe(1);
});
test('deleteUpload of mono → privat transfer is expense again');
test('report: income, expense, net, byCategory sorted desc; refund +69 in cafe reduces cafe');
test('getMonthly returns zero-filled months in order');
test('getTransactions filters by category and q (case-insensitive)');
test('getLatestMonth on empty db → null');
```

- [ ] **Step 3: Запустить** `npm test` → FAIL. **Step 4: Реализовать.** **Step 5: Запустить** → PASS.
- [ ] **Step 6: Commit** `feat: database schema, ingest and reports`

---

### Task 7: Вход и защита

**Files:**
- Create: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `scripts/hash-password.ts`, `src/lib/auth/rate-limit.ts`, `.env.example`
- Test: `tests/lib/auth.test.ts`, `tests/middleware.test.ts`

**Interfaces:**
- Produces:
```ts
hashPassword(pw: string): string                 // 'scrypt:<saltHex>:<hashHex>', node:crypto scrypt
verifyPassword(pw: string, stored: string): boolean   // timingSafeEqual
createSessionToken(): Promise<string>            // jose HS256, sub 'family', exp 90 дней, ключ SESSION_SECRET
verifySessionToken(t: string | undefined): Promise<boolean>
isRateLimited(db: Db, ip: string): Promise<boolean>   // ≥5 неудачных попыток за 15 мин
recordFailedLogin(db: Db, ip: string): Promise<void>
loginAction(prev: { error?: string }, form: FormData): Promise<{ error?: string }>   // server action, успех → redirect('/')
logoutAction(): Promise<void>
```

Middleware (edge-совместимый, использует только `jose`) пропускает `/login`, `/manifest.webmanifest`, `/icon*`, `/apple-icon*`, `/_next/*`, `/favicon.ico`. Остальное без валидной cookie: пути `/api/*` → `401 {"error":"unauthorized"}`, страницы → redirect `/login`. Ошибки на форме: неверный логин или пароль → «Неверный логин или пароль» (одинаково для обоих), лимит → «Слишком много попыток. Попробуйте через 15 минут». `scripts/hash-password.ts` (`npx tsx scripts/hash-password.ts <пароль>`) печатает хэш для env. В `.env.example` перечислены `DATABASE_URL`, `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET` без значений.

Экран входа в стиле «Тёмное стекло»: фон с плавающими пятнами, стеклянная карточка, поля «Логин» и «Пароль», кнопка «Войти» с градиентом, при ошибке карточка трясётся (motion).

- [ ] **Step 1: Написать падающие тесты**

```ts
expect(verifyPassword('secret', hashPassword('secret'))).toBe(true);
expect(verifyPassword('wrong', hashPassword('secret'))).toBe(false);
expect(hashPassword('a')).not.toBe(hashPassword('a'));         // соль
expect(await verifySessionToken(await createSessionToken())).toBe(true);
expect(await verifySessionToken('garbage')).toBe(false);
expect(await verifySessionToken(tokenSignedWithOtherSecret)).toBe(false);
expect(await verifySessionToken(expiredToken)).toBe(false);
// middleware.test.ts — вызвать middleware(new NextRequest(...))
expect((await middleware(req('/api/upload', 'POST'))).status).toBe(401);
expect((await middleware(req('/'))).headers.get('location')).toMatch(/\/login$/);
expect((await middleware(req('/', validCookie))).headers.get('x-middleware-next')).toBe('1');
expect((await middleware(req('/login'))).headers.get('x-middleware-next')).toBe('1');
// rate limit на createTestDb()
for (let i=0;i<5;i++) await recordFailedLogin(db,'1.1.1.1');
expect(await isRateLimited(db,'1.1.1.1')).toBe(true);
expect(await isRateLimited(db,'2.2.2.2')).toBe(false);
```

- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать.** IP берётся из `x-forwarded-for` (первый адрес). **Step 4: Запустить** → PASS.
- [ ] **Step 5: Проверить, что секреты не попали в бандл:** `npm run build && grep -r "AUTH_PASSWORD_HASH\|SESSION_SECRET" .next/static || echo clean` → `clean`.
- [ ] **Step 6: Commit** `feat: password login, session cookie, route protection`

---

### Task 8: Оболочка приложения и экран «Загрузка»

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/Glass.tsx`, `src/components/Background.tsx`, `src/components/TabBar.tsx`, `src/components/Dropzone.tsx`, `src/app/(app)/upload/page.tsx`, `src/app/(app)/upload/actions.ts`, `src/app/api/upload/route.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Test: `tests/api/upload.test.ts`

**Interfaces:**
- Consumes: `parseStatement`, `StatementError` (3), `ingestStatement`, `deleteUpload`, `listUploads`, `getDb` (6), `verifySessionToken` (7)
- Produces: `POST /api/upload` (multipart, поле `file`, **один файл на запрос**) → `200 IngestResult` | `400 { error: string }` (русское сообщение `StatementError` или «Файл больше 4 МБ») | `401`. Обработчик сам проверяет сессию, не полагаясь только на middleware. `deleteUploadAction(id: number)`. Компоненты: `<Glass className?>`, `<Background />` (пятна, медленное плавание), `<TabBar />` (Обзор `/`, Загрузка `/upload`, Операции `/transactions`; активная вкладка бирюзовая; закреплена снизу с учётом `env(safe-area-inset-bottom)`).

Экран загрузки (см. мокап `screens.html`, левый экран): Dropzone принимает `.xls,.xlsx`, несколько файлов. Клиент отправляет их **последовательно** по одному. Каждый файл показывается строкой: спиннер → «✓ 142 операции · 61 новых · 37 уже было» или ошибка красным. Предупреждения выводятся под строкой. После всех файлов идёт карточка «Найдено переводов между своими: N · не учитываются» (сумма `internalFound`) и `router.refresh()`. Ниже «Прошлые загрузки»: имя файла, банк, период, сколько добавлено, кнопка «Удалить» с подтверждением прямо в строке (кнопка превращается в «Точно удалить?», без `window.confirm`).

- [ ] **Step 1: Написать падающий тест** route handler (вызвать `POST` напрямую с `Request` и `FormData`; `getDb` замокать на `createTestDb()`, `cookies` — через валидный токен):

```ts
test('valid privat file → 200 with counts');
test('second upload of same file → added 0');
test('garbage file → 400 with Russian message');
test('no session cookie → 401');
```

- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать** route, затем оболочку и экран. **Step 4: Запустить** → PASS.
- [ ] **Step 5: Проверить вручную:** `npm run dev` с локальной БД (Neon dev-ветка или docker postgres + `npx drizzle-kit migrate`), войти, загрузить фикстуры, сгенерированные `buildXlsx` (скрипт `scripts/make-sample-files.ts` пишет их в `samples/`, папку добавить в `.gitignore`). Снять скриншот на ширине 390px (chrome-devtools MCP `resize_page` 390×844).
- [ ] **Step 6: Commit** `feat: app shell and statement upload`

---

### Task 9: «Обзор» и «Внутри категории»

**Files:**
- Create: `src/app/(app)/page.tsx`, `src/app/(app)/category/[id]/page.tsx`, `src/components/AnimatedNumber.tsx`, `src/components/CategoryBars.tsx`, `src/components/MonthlyBars.tsx`, `src/components/PeriodPicker.tsx`, `src/components/TxList.tsx`, `src/lib/period.ts`
- Test: `tests/lib/period.test.ts`

**Interfaces:**
- Consumes: `getReport`, `getMonthly`, `getTransactions`, `getLatestMonth` (6), `CATEGORIES` (4), `formatUAH` (1)
- Produces: `resolvePeriod(sp: { month?: string; from?: string; to?: string }, latest: string | null): { range: Range; label: string; month: string | null } | null`, где `label` — «Октябрь 2026» или «1 окт – 15 окт 2026»; `prevMonth(m: string): string`; `<TxList rows={TxRow[]} />`. Период живёт в URL: `?month=2026-10` или `?from=…&to=…`. Ссылки на категорию и вкладки его сохраняют.

Обзор (мокап `visual-style.html`, вариант A, и правый экран `screens.html`), сверху вниз:
1. `PeriodPicker`: заголовок периода с ▾; чипы соседних месяцев, у которых есть данные, и «Свой период» (два `<input type="date">`).
2. «Итог месяца» — `AnimatedNumber` с `formatUAH(net, { sign: true, decimals: 0 })`. При плюсе градиент `#a7f3d0 → #67e8f9`, при минусе `#fda4af → #f472b6`.
3. Две стеклянные карточки «Доходы» и «Расходы».
4. «Куда ушли деньги»: категории по убыванию, эмодзи, название, сумма, полоса шириной `amount / max`, анимация `scaleX` от 0 с задержкой по индексу. Строка кликабельна → `/category/<id>?<период>`.
5. «По месяцам»: 6 месяцев по `month` включительно, столбики `|net|`, плюс `#6ee7b7`, минус `#fda4af`. Подпись «vs <прошлый месяц>: Расходы −6% · Доходы +4%». Если в прошлом месяце 0, то «—».
6. Нет данных (`getLatestMonth` = null) → вместо всего этого стеклянная карточка «Загрузите первые выписки» со ссылкой на `/upload`.

Анимации: карточки появляются снизу вверх (`opacity 0→1`, `y 14→0`, задержка 80 мс по порядку). Числа пересчитываются за 0.8 с при смене периода. Всё это через `motion`, а при `useReducedMotion()` анимации отключаются.

Внутри категории: «← <период>», заголовок «<эмодзи> <название> · <сумма>», список `TxList` (описание, «26 окт · Моно *9314», сумма; возвраты зелёным).

- [ ] **Step 1: Написать падающие тесты**

```ts
expect(resolvePeriod({}, '2026-10')).toEqual({ range:{from:'2026-10-01',to:'2026-10-31'}, label:'Октябрь 2026', month:'2026-10' });
expect(resolvePeriod({ month:'2026-02' }, '2026-10')!.range.to).toBe('2026-02-28');
expect(resolvePeriod({ from:'2026-10-01', to:'2026-10-15' }, null)!.label).toBe('1 окт – 15 окт 2026');
expect(resolvePeriod({ month:'garbage' }, '2026-10')!.month).toBe('2026-10');   // мусор → последний месяц
expect(resolvePeriod({}, null)).toBeNull();
expect(prevMonth('2026-01')).toBe('2025-12');
```

- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать.** **Step 4: Запустить** → PASS.
- [ ] **Step 5: Проверить вручную** на 390×844 с загруженными фикстурами: итог совпадает с суммой по фикстурам, клик по категории открывает список, смена месяца анимирует числа. Сохранить скриншот.
- [ ] **Step 6: Commit** `feat: overview and category screens`

---

### Task 10: «Операции», PWA и деплой

**Files:**
- Create: `src/app/(app)/transactions/page.tsx`, `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `README.md`
- Modify: `src/app/layout.tsx` (metadata и viewport)

**Interfaces:**
- Consumes: `getTransactions`, `resolvePeriod`, `TxList`, `PeriodPicker`

Операции: тот же `PeriodPicker`, поле поиска (`?q=`, debounce 300 мс, `router.replace`), `TxList` со всеми операциями периода. Внутренние переводы показываются приглушёнными с пометкой «между своими».

PWA: `manifest.ts`: name «Семейные финансы», short_name «Финансы», `display: 'standalone'`, `background_color` и `theme_color` `#07070d`, `start_url: '/'`. `icon.tsx` и `apple-icon.tsx` через `ImageResponse`: градиентный фиолетово-бирюзовый скруглённый квадрат с «₴». В `layout.tsx`: `appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Финансы' }`, `viewport: { themeColor: '#07070d', viewportFit: 'cover' }`, `lang="ru"`. Service worker не нужен (офлайн вне scope).

README (по-русски): создать БД в Neon → `DATABASE_URL`; `npx tsx scripts/hash-password.ts '<пароль>'` → `AUTH_PASSWORD_HASH`; `openssl rand -base64 32` → `SESSION_SECRET`; `npx drizzle-kit migrate`; деплой на Vercel с этими env; установка на iPhone: Safari → Поделиться → «На экран Домой».

- [ ] **Step 1: Реализовать** экран операций, manifest, иконки и metadata.
- [ ] **Step 2: Проверить:** `npm test` → всё PASS; `npm run build` → успешно; в dev `GET /manifest.webmanifest` отдаётся без входа, `GET /apple-icon` отдаёт PNG.
- [ ] **Step 3: Проверка на реальных выписках.** Попросить Виталия положить реальные файлы Привата и Моно (свои и жены) в `samples/` (в git не попадает). Загрузить их в локальное приложение и сверить:
  - число операций с числом строк в файлах;
  - итог месяца со «вручную» посчитанной суммой (скрипт или таблица);
  - что найденные «переводы между своими» действительно такие;
  - включена ли комиссия monobank в `Сума в валюті картки`. Если нет, добавить её в сумму в `parseMono`, с тестом.

  Найденные расхождения превратить в тесты (обезличенные фикстуры) и исправить.
- [ ] **Step 4: Commit** `feat: transactions screen, PWA manifest, deploy docs`
