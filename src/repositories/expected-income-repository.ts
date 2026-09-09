import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { ExpectedIncomeInput } from '@/features/expected-income/schemas/expected-income';
import type { ExpectedIncomeView } from '@/features/expected-income/types/expected-income';
import type { IncomeKind } from '@/domain/types';

function map(row: Record<string, unknown>): ExpectedIncomeView {
  return {
    id: String(row.id), cycleId: String(row.cycle_id), sourceName: String(row.source_name),
    expectedAmount: String(row.expected_amount), expectedDate: String(row.expected_date),
    incomeKind: String(row.income_kind) as IncomeKind, isPrimary: Boolean(row.is_primary),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export class ExpectedIncomeRepository {
  async listByCycle(userId: string, cycleId: string) {
    const rows = await rawSql`select id,cycle_id,source_name,expected_amount::text,expected_date::text,income_kind,is_primary,created_at::text,updated_at::text from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId} order by is_primary desc, expected_date asc, created_at asc`;
    return rows.map(r => map(r as Record<string, unknown>));
  }

  async getById(userId: string, id: string) {
    const rows = await rawSql`select id,cycle_id,source_name,expected_amount::text,expected_date::text,income_kind,is_primary,created_at::text,updated_at::text from public.expected_incomes where user_id=${userId} and id=${id} limit 1`;
    return rows[0] ? map(rows[0] as Record<string, unknown>) : null;
  }

  async create(userId: string, input: ExpectedIncomeInput) {
    const id = randomUUID();
    const insert = rawSql`insert into public.expected_incomes(id,user_id,cycle_id,source_name,expected_amount,expected_date,income_kind,is_primary) values(${id},${userId},${input.cycleId},${input.sourceName},${input.expectedAmount},${input.expectedDate},${input.incomeKind},${input.isPrimary}) returning id,cycle_id,source_name,expected_amount::text,expected_date::text,income_kind,is_primary,created_at::text,updated_at::text`;
    if (!input.isPrimary) {
      const rows = await insert;
      return map(rows[0] as Record<string, unknown>);
    }
    const result = await rawSql.transaction([
      rawSql`update public.expected_incomes set is_primary=false where user_id=${userId} and cycle_id=${input.cycleId} and is_primary=true`,
      insert,
    ]);
    const rows = result[1] as unknown[];
    return map(rows[0] as Record<string, unknown>);
  }

  async update(userId: string, id: string, input: ExpectedIncomeInput) {
    const update = rawSql`update public.expected_incomes set source_name=${input.sourceName},expected_amount=${input.expectedAmount},expected_date=${input.expectedDate},income_kind=${input.incomeKind},is_primary=${input.isPrimary} where id=${id} and user_id=${userId} and cycle_id=${input.cycleId} returning id,cycle_id,source_name,expected_amount::text,expected_date::text,income_kind,is_primary,created_at::text,updated_at::text`;
    if (!input.isPrimary) {
      const rows = await update;
      return rows[0] ? map(rows[0] as Record<string, unknown>) : null;
    }
    const result = await rawSql.transaction([
      rawSql`update public.expected_incomes set is_primary=false where user_id=${userId} and cycle_id=${input.cycleId} and id<>${id} and is_primary=true`,
      update,
    ]);
    const rows = result[1] as unknown[];
    return rows[0] ? map(rows[0] as Record<string, unknown>) : null;
  }
}
export const expectedIncomeRepository = new ExpectedIncomeRepository();
