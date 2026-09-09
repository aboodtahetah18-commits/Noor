import { z } from 'zod';

function isIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const updateProfileSettingsSchema = z.object({
  displayName: z.string().trim().max(120).transform((value) => value || null),
  timezone: z.string().trim().min(1).max(100).refine(isIanaTimezone, 'المنطقة الزمنية غير صالحة.'),
});

export type UpdateProfileSettingsInput = z.infer<typeof updateProfileSettingsSchema>;
