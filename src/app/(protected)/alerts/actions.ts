'use server';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { updateAlertLifecycle } from '@/features/alerts/commands/update-alert-lifecycle';
function v(f:FormData,n:string){return String(f.get(n)??'').trim()}
export async function markAlertSeenAction(f:FormData){const u=await requireAuthenticatedMutationUser('alert-seen');await updateAlertLifecycle(u.id,{alertKey:v(f,'alertKey'),alertKind:v(f,'alertKind'),sourceId:v(f,'sourceId')||null,event:'SEEN'});redirect('/alerts')}
export async function startAlertAction(f:FormData){const u=await requireAuthenticatedMutationUser('alert-start');const href=v(f,'href');await updateAlertLifecycle(u.id,{alertKey:v(f,'alertKey'),alertKind:v(f,'alertKind'),sourceId:v(f,'sourceId')||null,event:'STARTED'});redirect(href.startsWith('/')&&!href.startsWith('//')?href:'/alerts')}
export async function snoozeAlertAction(f:FormData){const u=await requireAuthenticatedMutationUser('alert-snooze');if(v(f,'severity')==='CRITICAL')redirect('/alerts?error=التنبيه الحرج لا يمكن تأجيله');await updateAlertLifecycle(u.id,{alertKey:v(f,'alertKey'),alertKind:v(f,'alertKind'),sourceId:v(f,'sourceId')||null,event:'SNOOZED',snoozeHours:24});redirect('/alerts')}
