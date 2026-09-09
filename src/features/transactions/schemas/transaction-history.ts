import { z } from 'zod';
import { PLANNING_STATUSES, TRANSACTION_TYPES } from '@/domain/types';

const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const optionalUuid = z.string().uuid().optional();

export const transactionHistoryFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  categoryId: optionalUuid,
  accountId: optionalUuid,
  planningStatus: z.enum(PLANNING_STATUSES).optional(),
  search: z.string().trim().max(120).optional().transform((value) => value || undefined),
  sort: z.enum(['DATE_DESC', 'DATE_ASC', 'AMOUNT_DESC', 'AMOUNT_ASC']).default('DATE_DESC'),
}).superRefine((value, ctx) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    ctx.addIssue({ code: 'custom', path: ['dateTo'], message: 'DATE_RANGE_INVALID' });
  }
});

export type TransactionHistoryFiltersInput = z.input<typeof transactionHistoryFiltersSchema>;
