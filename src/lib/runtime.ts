export const APP_NAME = 'personal-finance-advisor' as const;
export const BASE_CURRENCY = 'SAR' as const;
export const DEFAULT_TIMEZONE = 'Asia/Riyadh' as const;

export function healthcheck() {
  return {
    app: APP_NAME,
    status: 'ok' as const,
    baseCurrency: BASE_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
  };
}
