import { updateProfileSettingsSchema } from '@/features/settings/schemas/settings';
import { settingsRepository } from '@/repositories/settings-repository';

export async function updateProfileSettings(userId: string, raw: unknown) {
  const parsed = updateProfileSettingsSchema.safeParse(raw);
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? 'بيانات الإعدادات غير صالحة.' };
  const profile = await settingsRepository.updateProfile(userId, parsed.data);
  return { success: true as const, profile };
}
