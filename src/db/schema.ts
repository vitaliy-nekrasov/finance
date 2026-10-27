import { bigint, date, index, integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  bank: text('bank').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  periodFrom: date('period_from', { mode: 'string' }),
  periodTo: date('period_to', { mode: 'string' }),
  total: integer('total').notNull().default(0),
  added: integer('added').notNull().default(0),
  duplicates: integer('duplicates').notNull().default(0),
});

export const accounts = pgTable('accounts', {
  key: text('key').primaryKey(),
  bank: text('bank').notNull(),
  label: text('label').notNull(),
  last4: text('last4').array().notNull().default([]),
});

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    dedupKey: text('dedup_key').notNull().unique(),
    bank: text('bank').notNull(),
    accountKey: text('account_key').notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'string' }).notNull(),
    amountKop: bigint('amount_kop', { mode: 'number' }).notNull(),
    description: text('description').notNull(),
    bankCategory: text('bank_category'),
    mcc: integer('mcc'),
    category: text('category').notNull(),
    kind: text('kind').notNull(),
  },
  (t) => [index('transactions_occurred_at_idx').on(t.occurredAt)],
);

/** Which uploads contain which transaction: a row lives while at least one upload still contains it. */
export const uploadTransactions = pgTable(
  'upload_transactions',
  {
    uploadId: integer('upload_id')
      .notNull()
      .references(() => uploads.id, { onDelete: 'cascade' }),
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.uploadId, t.transactionId] }),
    index('upload_transactions_transaction_id_idx').on(t.transactionId),
  ],
);

export const loginAttempts = pgTable('login_attempts', {
  id: serial('id').primaryKey(),
  ip: text('ip').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});
