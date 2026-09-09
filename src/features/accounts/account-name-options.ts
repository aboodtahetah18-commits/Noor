import type { AccountType } from '@/domain/types';

export const ACCOUNT_NAME_PRESETS = [
  'الحساب الرئيسي',
  'الحساب الجاري',
  'حساب الراتب',
  'حساب الادخار',
  'الحساب الفرعي',
  'الحساب المشترك',
  'الحساب الاستثماري',
  'حساب وديعة',
  'حساب تجاري',
  'محفظة رقمية',
  'نقدي',
  'بطاقة ائتمانية',
] as const;

export function deriveAccountType(name: string): AccountType {
  const value = name.trim();
  if (value.includes('ادخار') || value.includes('وديعة')) return 'SAVINGS';
  if (value.includes('محفظة')) return 'OTHER';
  if (value === 'نقدي' || value.includes('كاش')) return 'CASH';
  if (
    value.includes('رئيسي') || value.includes('جاري') || value.includes('راتب') ||
    value.includes('فرعي') || value.includes('مشترك') || value.includes('تجاري')
  ) return 'BANK';
  return 'OTHER';
}
