export type BankOption = { code: string; name: string; shortName: string };

export const BANK_OPTIONS: BankOption[] = [
  { code: 'ALRAJHI', name: 'مصرف الراجحي', shortName: 'الراجحي' },
  { code: 'SNB', name: 'البنك الأهلي السعودي', shortName: 'الأهلي' },
  { code: 'ALINMA', name: 'مصرف الإنماء', shortName: 'الإنماء' },
  { code: 'RIYAD', name: 'بنك الرياض', shortName: 'الرياض' },
  { code: 'SAB', name: 'البنك السعودي الأول', shortName: 'الأول' },
  { code: 'ANB', name: 'البنك العربي الوطني', shortName: 'العربي' },
  { code: 'BSF', name: 'البنك السعودي الفرنسي', shortName: 'الفرنسي' },
  { code: 'SAIB', name: 'البنك السعودي للاستثمار', shortName: 'الاستثمار' },
  { code: 'BANKALJAZIRA', name: 'بنك الجزيرة', shortName: 'الجزيرة' },
  { code: 'BANKALBILAD', name: 'بنك البلاد', shortName: 'البلاد' },
  { code: 'GIB', name: 'بنك الخليج الدولي', shortName: 'الخليج' },
  { code: 'STCBANK', name: 'STC Bank', shortName: 'STC' },
  { code: 'D360', name: 'D360 Bank', shortName: 'D360' },
];

export function bankByCode(code?: string | null): BankOption | undefined {
  return BANK_OPTIONS.find((bank) => bank.code === code);
}

export function bankByName(name?: string | null): BankOption | undefined {
  const normalized = String(name ?? '').trim().toLocaleLowerCase('ar');
  return BANK_OPTIONS.find((bank) =>
    bank.name.toLocaleLowerCase('ar') === normalized || bank.shortName.toLocaleLowerCase('ar') === normalized,
  );
}
