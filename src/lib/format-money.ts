import { Money } from '@/financial-engine/money';

const wholeFormatter = new Intl.NumberFormat('ar-SA-u-nu-latn', { maximumFractionDigits: 0 });

export function formatSar(value: string | Money): string {
  const money = typeof value === 'string' ? Money.parse(value) : value;
  const negative = money.minorUnits < 0n;
  const absolute = negative ? -money.minorUnits : money.minorUnits;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${wholeFormatter.format(whole)}.${fraction} \u20C1`;
}

// Backward-compatible alias for older feature modules.
export const formatMoney = formatSar;
