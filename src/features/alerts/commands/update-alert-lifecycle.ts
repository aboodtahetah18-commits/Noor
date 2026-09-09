import { rawSql } from '@/infrastructure/db/client';
export async function updateAlertLifecycle(userId:string,input:{alertKey:string;alertKind:string;sourceId?:string|null;event:'SEEN'|'STARTED'|'SNOOZED'|'REOPENED';snoozeHours?:number;alertSnapshot?:unknown}){
  const next=input.event==='SEEN'?'SEEN':input.event==='STARTED'?'IN_PROGRESS':input.event==='SNOOZED'?'SNOOZED':'NEW';
  const h=Math.max(1,Math.min(168,Math.floor(input.snoozeHours??24)));const until=input.event==='SNOOZED'?new Date(Date.now()+h*3600000):null;
  const old=await rawSql`select status from public.alert_lifecycle_states where user_id=${userId} and alert_key=${input.alertKey} limit 1`;const before=old[0]?String(old[0].status):'NEW';
  await rawSql.transaction([
    rawSql`insert into public.alert_lifecycle_states(user_id,alert_key,alert_kind,source_id,status,snoozed_until,last_seen_at,updated_at) values(${userId},${input.alertKey},${input.alertKind},${input.sourceId??null},${next},${until},now(),now()) on conflict(user_id,alert_key) do update set alert_kind=excluded.alert_kind,source_id=excluded.source_id,status=excluded.status,snoozed_until=excluded.snoozed_until,last_seen_at=now(),updated_at=now() returning id`,
    rawSql`insert into public.alert_lifecycle_events(user_id,alert_key,alert_kind,source_id,event_type,status_before,status_after,alert_snapshot,metadata) values(${userId},${input.alertKey},${input.alertKind},${input.sourceId??null},${input.event},${before},${next},${JSON.stringify(input.alertSnapshot??{})}::jsonb,${JSON.stringify(input.event==='SNOOZED'?{snoozeHours:h}:{})}::jsonb) returning id`
  ]);
}
