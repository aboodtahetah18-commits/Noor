import { boolean, char, date, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  baseCurrency: char('base_currency', { length: 3 }).notNull().default('SAR'),
  timezone: text('timezone').notNull().default('Asia/Riyadh'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  accountType: text('account_type').notNull(),
  bankCode: text('bank_code'),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  iban: text('iban'),
  cardLast4: char('card_last4', { length: 4 }),
  currency: char('currency', { length: 3 }).notNull().default('SAR'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accountOpeningBalances = pgTable('account_opening_balances', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});


export const financialCycles = pgTable('financial_cycles', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  expectedNextIncomeDate: date('expected_next_income_date').notNull(),
  status: text('status').notNull().default('DRAFT'),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  closingStartedAt: timestamp('closing_started_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const expectedIncomes = pgTable('expected_incomes', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  cycleId: uuid('cycle_id').notNull().references(() => financialCycles.id, { onDelete: 'restrict' }),
  sourceName: text('source_name').notNull(),
  expectedAmount: numeric('expected_amount', { precision: 18, scale: 2 }).notNull(),
  expectedDate: date('expected_date').notNull(),
  incomeKind: text('income_kind').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


export const financialPlans = pgTable('financial_plans', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete:'restrict' }), cycleId: uuid('cycle_id').notNull().references(() => financialCycles.id, { onDelete:'restrict' }), currentVersionId: uuid('current_version_id'), status:text('status').notNull().default('PLAN_DRAFT'), createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(), approvedAt:timestamp('approved_at',{withTimezone:true}), closedAt:timestamp('closed_at',{withTimezone:true}), updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()
});
export const planVersions = pgTable('plan_versions', { id:uuid('id').primaryKey(), userId:uuid('user_id').notNull().references(()=>profiles.id,{onDelete:'restrict'}), planId:uuid('plan_id').notNull().references(()=>financialPlans.id,{onDelete:'restrict'}), versionNumber:integer('version_number').notNull(), revisionReason:text('revision_reason'), isCurrent:boolean('is_current').notNull().default(false), createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(), approvedAt:timestamp('approved_at',{withTimezone:true}) });
export const budgetCategories = pgTable('budget_categories',{ id:uuid('id').primaryKey(),userId:uuid('user_id').notNull().references(()=>profiles.id,{onDelete:'restrict'}),name:text('name').notNull(),categoryGroup:text('category_group').notNull(),expenseNatureDefault:text('expense_nature_default'),isEssential:boolean('is_essential').notNull().default(false),isActive:boolean('is_active').notNull().default(true),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow() });
export const budgetAllocations = pgTable('budget_allocations',{ id:uuid('id').primaryKey(),userId:uuid('user_id').notNull().references(()=>profiles.id,{onDelete:'restrict'}),planVersionId:uuid('plan_version_id').notNull().references(()=>planVersions.id,{onDelete:'restrict'}),categoryId:uuid('category_id').notNull().references(()=>budgetCategories.id,{onDelete:'restrict'}),plannedAmount:numeric('planned_amount',{precision:18,scale:2}).notNull(),allocationType:text('allocation_type').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow() });



export const transfers = pgTable('transfers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  cycleId: uuid('cycle_id').references(() => financialCycles.id, { onDelete: 'restrict' }),
  fromAccountId: uuid('from_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  toAccountId: uuid('to_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description'),
  idempotencyKey: text('idempotency_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  postedAt: timestamp('posted_at', { withTimezone: true }),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  cycleId: uuid('cycle_id').references(() => financialCycles.id, { onDelete: 'restrict' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'restrict' }),
  transactionType: text('transaction_type').notNull(),
  status: text('status').notNull().default('PENDING'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description'),
  categoryId: uuid('category_id').references(() => budgetCategories.id, { onDelete: 'restrict' }),
  planningStatus: text('planning_status'),
  expenseNature: text('expense_nature'),
  transactionDirection: text('transaction_direction'),
  transferId: uuid('transfer_id').references(() => transfers.id, { onDelete: 'restrict' }),
  expectedIncomeId: uuid('expected_income_id').references(() => expectedIncomes.id, { onDelete: 'restrict' }),
  incomeSourceName: text('income_source_name'),
  incomeKind: text('income_kind'),
  incomeIsPartial: boolean('income_is_partial'),
  relatedTransactionId: uuid('related_transaction_id'),
  idempotencyKey: text('idempotency_key'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  reversedAt: timestamp('reversed_at', { withTimezone: true }),
  reversalReason: text('reversal_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
