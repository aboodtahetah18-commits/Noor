'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { requestAuthorizationGrantFromTemplate } from '@/features/governance/services/authorization-template-provisioning-service';

function value(fd: FormData, key: string): string { return String(fd.get(key) ?? '').trim(); }
function optional(fd: FormData, key: string): string | null { const v=value(fd,key); return v || null; }
function amount(fd: FormData): number | null {
  const raw=value(fd,'maxAmount');
  if(!raw) return null;
  const parsed=Number(raw);
  if(!Number.isFinite(parsed) || parsed<0) throw new Error('AUTHORIZATION_TEMPLATE_AMOUNT_INVALID');
  return parsed;
}
function rationale(fd: FormData): string {
  const text=value(fd,'rationale').slice(0,4000);
  if(text.length<20) throw new Error('PROVISIONING_RATIONALE_REQUIRED');
  return text;
}
function safe(error: unknown): string {
  const raw=error instanceof Error?error.message:'AUTHORIZATION_TEMPLATE_REQUEST_FAILED';
  return raw.startsWith('AUTHORIZATION_') || raw.startsWith('PROVISIONING_') ? raw : 'AUTHORIZATION_TEMPLATE_REQUEST_FAILED';
}

export async function createGrantFromTemplateAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    await requestAuthorizationGrantFromTemplate({
      actorUserId:actor.id,
      templateKey:value(fd,'templateKey'),
      bankKey:optional(fd,'bankKey'),
      committeeId:optional(fd,'committeeId'),
      caseType:optional(fd,'caseType'),
      maxAmount:amount(fd),
      rationale:rationale(fd),
    });
    revalidatePath('/governance/authorization');
    revalidatePath('/governance/authorization/templates');
    redirect('/governance/authorization?status=success&message=GRANT_REQUEST_CREATED');
  } catch(error) {
    redirect(`/governance/authorization/templates?status=error&message=${encodeURIComponent(safe(error))}`);
  }
}
