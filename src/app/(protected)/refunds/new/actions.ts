'use server';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { recordRefund } from '@/features/refunds/commands/record-refund';
export async function recordRefundAction(formData:FormData){const user=await requireAuthenticatedMutationUser();await recordRefund(user.id,{originalTransactionId:String(formData.get('originalTransactionId')??''),accountId:String(formData.get('accountId')??''),amount:String(formData.get('amount')??''),transactionDate:String(formData.get('transactionDate')??''),description:String(formData.get('description')??''),idempotencyKey:String(formData.get('idempotencyKey')||randomUUID())});}
