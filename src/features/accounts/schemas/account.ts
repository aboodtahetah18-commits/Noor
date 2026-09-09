import { z } from 'zod';

export const accountTypeSchema = z.enum(['BANK', 'SAVINGS', 'CASH', 'OTHER']);

const optionalText = (max: number) => z.preprocess(
  (value) => String(value ?? '').trim() || undefined,
  z.string().max(max).optional(),
);
const optionalLast4 = z.preprocess(
  (value) => String(value ?? '').replace(/\D/g, '') || undefined,
  z.string().regex(/^\d{4}$/, 'أدخل آخر 4 أرقام فقط').optional(),
);
const optionalIban = z.preprocess(
  (value) => String(value ?? '').replace(/\s+/g, '').toUpperCase() || undefined,
  z.string().regex(/^SA\d{22}$/, 'أدخل IBAN سعوديًا صحيحًا يبدأ بـ SA ويتكون من 24 خانة').optional(),
);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'اسم الحساب مطلوب').max(120),
  accountType: accountTypeSchema,
  openingBalance: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, 'أدخل مبلغًا صالحًا بحد أقصى منزلتين عشريتين'),
  effectiveDate: z.iso.date(),
  bankCode: optionalText(40),
  bankName: optionalText(120),
  accountNumber: optionalText(64),
  iban: optionalIban,
  cardLast4: optionalLast4,
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
