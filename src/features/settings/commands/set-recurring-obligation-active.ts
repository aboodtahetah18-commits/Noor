import { settingsRepository } from '@/repositories/settings-repository';

export async function setRecurringObligationActive(userId: string, templateId: string, isActive: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(templateId)) return { success: false as const, message: 'معرف الالتزام غير صالح.' };
  await settingsRepository.setRecurringObligationActive(userId, templateId, isActive);
  return { success: true as const };
}
