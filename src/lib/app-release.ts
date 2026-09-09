export const APP_VERSION = '1.5.0';

export function appEnvironmentLabel(): string {
  return process.env.APP_ENV === 'production' ? 'الإنتاج' : 'بيئة التشغيل';
}
