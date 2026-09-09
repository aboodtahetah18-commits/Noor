import { z } from 'zod';

export const reverseTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export type ReverseTransactionInput = z.infer<typeof reverseTransactionSchema>;
