import { rawSql } from '@/infrastructure/db/client';
import type { ProfileSettings, RecurringObligationTemplateSetting } from '@/features/settings/types/settings';

export class SettingsRepository {
  async getProfile(userId: string): Promise<ProfileSettings> {
    const rows = await rawSql`select display_name,base_currency,timezone from public.profiles where id=${userId}::uuid limit 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error('PROFILE_NOT_FOUND');
    return {
      displayName: row.display_name ? String(row.display_name) : null,
      baseCurrency: 'SAR',
      timezone: String(row.timezone || 'Asia/Riyadh'),
    };
  }

  async updateProfile(userId: string, input: { displayName: string | null; timezone: string }): Promise<ProfileSettings> {
    const rows = await rawSql`update public.profiles
      set display_name=${input.displayName}, timezone=${input.timezone}, base_currency='SAR', updated_at=now()
      where id=${userId}::uuid
      returning display_name,base_currency,timezone`;
    if (!rows[0]) throw new Error('PROFILE_NOT_FOUND');
    return {
      displayName: rows[0].display_name ? String(rows[0].display_name) : null,
      baseCurrency: 'SAR',
      timezone: String(rows[0].timezone),
    };
  }

  async listRecurringObligations(userId: string): Promise<RecurringObligationTemplateSetting[]> {
    const rows = await rawSql`select t.id,t.name,t.default_amount::text,t.recurrence,t.priority,t.expected_account_id,
        a.name as expected_account_name,t.is_active
      from public.obligation_templates t
      left join public.accounts a on a.id=t.expected_account_id and a.user_id=t.user_id
      where t.user_id=${userId}::uuid
      order by t.is_active desc,t.created_at desc`;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      defaultAmount: String(row.default_amount),
      recurrence: String(row.recurrence),
      priority: row.priority == null ? null : Number(row.priority),
      expectedAccountId: row.expected_account_id ? String(row.expected_account_id) : null,
      expectedAccountName: row.expected_account_name ? String(row.expected_account_name) : null,
      isActive: Boolean(row.is_active),
    }));
  }

  async setRecurringObligationActive(userId: string, templateId: string, isActive: boolean): Promise<boolean> {
    const rows = await rawSql`update public.obligation_templates set is_active=${isActive},updated_at=now()
      where id=${templateId}::uuid and user_id=${userId}::uuid and is_active<>${isActive}
      returning id`;
    return Boolean(rows[0]);
  }
}

export const settingsRepository = new SettingsRepository();
