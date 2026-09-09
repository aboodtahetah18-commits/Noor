import { randomUUID } from 'node:crypto';
import { and, eq, sql as dsql } from 'drizzle-orm';
import { rawSql, getDb } from '@/infrastructure/db/client';
import { accounts } from '@/infrastructure/db/financial-schema';
import type { CreateAccountInput } from '@/features/accounts/schemas/account';
import type { AccountDetails, AccountSummary } from '@/features/accounts/types/account';
import type { AccountType } from '@/domain/types';
import { bankByCode } from '@/features/accounts/banks';

function last4(value: unknown): string | undefined {
  const text = String(value ?? '').replace(/\s+/g, '');
  return text ? text.slice(-4) : undefined;
}

function masked(suffix?: string, prefix = '••••'): string | undefined {
  return suffix ? `${prefix} ${suffix}` : undefined;
}

function toSummary(row: Record<string, unknown>): AccountSummary {
  const bankCode = row.bank_code ? String(row.bank_code) : undefined;
  const explicitBankName = row.bank_name ? String(row.bank_name) : undefined;
  const accountNumberLast4 = last4(row.account_number);
  const ibanLast4 = last4(row.iban);
  return {
    id: String(row.account_id),
    name: String(row.name),
    accountType: String(row.account_type) as AccountType,
    currency: 'SAR',
    isActive: Boolean(row.is_active),
    openingBalance: String(row.opening_balance ?? '0.00'),
    balance: String(row.balance ?? '0.00'),
    bankCode,
    bankName: explicitBankName ?? bankByCode(bankCode)?.name,
    accountNumberMasked: masked(accountNumberLast4),
    ibanMasked: masked(ibanLast4, 'SA•• ••••'),
    cardLast4: row.card_last4 ? String(row.card_last4) : undefined,
  };
}

export class AccountRepository {
  async createWithOpeningBalance(userId: string, input: CreateAccountInput): Promise<string> {
    const accountId = randomUUID();
    const openingBalanceId = randomUUID();

    // Account + opening balance are one financial setup operation and must commit or roll back together.
    // Neon HTTP batches these statements through its transaction API while keeping the repository server-only.
    await rawSql.transaction([
      rawSql`insert into public.accounts
        (id,user_id,name,account_type,bank_code,bank_name,account_number,iban,card_last4,currency,is_active)
        values (${accountId},${userId},${input.name},${input.accountType},${input.bankCode ?? null},${input.bankName ?? null},${input.accountNumber ?? (input.iban ? input.iban.slice(6) : null)},${input.iban ?? null},${input.cardLast4 ?? null},'SAR',true)`,
      rawSql`insert into public.account_opening_balances
        (id,user_id,account_id,amount,effective_date)
        values (${openingBalanceId},${userId},${accountId},${input.openingBalance},${input.effectiveDate})`,
    ]);

    return accountId;
  }

  async listByUser(userId: string, includeInactive = false): Promise<AccountSummary[]> {
    const rows = await rawSql`select a.id as account_id,a.name,a.account_type,a.bank_code,a.bank_name,a.account_number,a.iban,a.card_last4,a.currency,a.is_active,
      coalesce(v.opening_balance,0)::text as opening_balance,coalesce(v.balance,0)::text as balance
      from public.accounts a
      left join public.account_balances_v v on v.account_id=a.id and v.user_id=a.user_id
      where a.user_id=${userId} and (${includeInactive} or a.is_active=true)
      order by a.is_active desc,a.created_at desc`;
    return rows.map((row) => toSummary(row as Record<string, unknown>));
  }

  async getById(userId: string, accountId: string): Promise<AccountDetails | null> {
    const rows = await rawSql`select a.id as account_id,a.name,a.account_type,a.bank_code,a.bank_name,a.account_number,a.iban,a.card_last4,a.currency,a.is_active,
      coalesce(v.opening_balance,0)::text as opening_balance,coalesce(v.balance,0)::text as balance,
      ob.effective_date::text as effective_date,a.created_at::text as created_at
      from public.accounts a
      left join public.account_opening_balances ob on ob.account_id=a.id and ob.user_id=a.user_id
      left join public.account_balances_v v on v.account_id=a.id and v.user_id=a.user_id
      where a.user_id=${userId} and a.id=${accountId}
      limit 1`;
    if (!rows[0]) return null;
    const base = toSummary(rows[0] as Record<string, unknown>);
    return { ...base, effectiveDate: String(rows[0].effective_date), createdAt: String(rows[0].created_at) };
  }

  async deactivate(userId: string, accountId: string): Promise<boolean> {
    const rows = await getDb().update(accounts)
      .set({ isActive: false, updatedAt: dsql`now()` })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .returning({ id: accounts.id });
    return rows.length === 1;
  }
}

export const accountRepository = new AccountRepository();
