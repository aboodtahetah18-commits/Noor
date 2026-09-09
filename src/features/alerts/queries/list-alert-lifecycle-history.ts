import { rawSql } from '@/infrastructure/db/client';

export type AlertLifecycleHistoryItem = {
  id: string;
  alertKey: string;
  alertKind: string;
  eventType: string;
  statusBefore: string | null;
  statusAfter: string | null;
  createdAt: string;
};

export async function listAlertLifecycleHistory(userId:string,limit=40):Promise<AlertLifecycleHistoryItem[]> {
  const rows=await rawSql`select id,alert_key as "alertKey",alert_kind as "alertKind",event_type as "eventType",status_before as "statusBefore",status_after as "statusAfter",created_at::text as "createdAt" from public.alert_lifecycle_events where user_id=${userId} order by created_at desc limit ${Math.max(1,Math.min(100,limit))}`;
  return rows.map((row)=>({
    id:String(row.id),
    alertKey:String(row.alertKey),
    alertKind:String(row.alertKind),
    eventType:String(row.eventType),
    statusBefore:row.statusBefore==null?null:String(row.statusBefore),
    statusAfter:row.statusAfter==null?null:String(row.statusAfter),
    createdAt:String(row.createdAt),
  }));
}
