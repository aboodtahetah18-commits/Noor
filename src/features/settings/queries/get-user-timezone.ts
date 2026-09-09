import { settingsRepository } from '@/repositories/settings-repository';

export async function getUserTimezone(userId: string): Promise<string> {
  return (await settingsRepository.getProfile(userId)).timezone;
}

export async function getUserOperationalDate(userId: string, now: Date = new Date()): Promise<string> {
  const timezone = await getUserTimezone(userId);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}
