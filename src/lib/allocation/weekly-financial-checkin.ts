import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getCurrentFinancialPlanMonitoring } from '@/lib/allocation/financial-plan-monitoring';

export async function publishWeeklyFinancialCheckin(userId:string,cycleId:string,periodStart:string){
  const sql=getRawSql();
  const roomRows=await sql`select id from public.conversation_threads where user_id=${userId}::uuid and room_key='central' limit 1`;
  const threadId=roomRows[0]?.id?String(roomRows[0].id):null;
  if(!threadId)return {created:false,reason:'NO_CENTRAL_ROOM'} as const;

  const key=`weekly-financial-checkin:${cycleId}:${periodStart}`;
  const existing=await sql`
    select id from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'weekly_checkin_key'=${key}
    limit 1
  `;
  if(existing[0]?.id)return {created:false,reason:'ALREADY_CREATED'} as const;

  const monitoring=await getCurrentFinancialPlanMonitoring(userId);
  const exceeded=monitoring?.items.filter(item=>item.status==='EXCEEDED')??[];
  const active=monitoring?.items.filter(item=>item.realizedAmount>0)??[];
  const body=exceeded.length
    ?`مراجعة السبت بدأت. ظهر تجاوز موثق في ${exceeded.map(item=>item.ownerName).join('، ')}. أرسل كشف الحساب لهذا الأسبوع أو الإيصالات والرسائل البنكية المرتبطة حتى أطابق العمليات وأحدد سبب الانحراف قبل تعديل أي خطة.`
    :`مراجعة السبت بدأت. أرسل كشف الحساب لهذا الأسبوع، أو الإيصالات والرسائل البنكية المتاحة. سأطابقها مع الميزانية والبنود المسجلة، وأوضح لك ما تم صرفه وما بقي وأي حركة غير واضحة تحتاج منك تفسيرًا.`;

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','budget-spending-owner','مسؤول الميزانية والإنفاق',
      'followup',${body},
      ${JSON.stringify({
        weekly_financial_checkin:true,
        weekly_checkin_key:key,
        cycle_id:cycleId,
        period_start:periodStart,
        active_budget_items:active.map(item=>item.ownerName),
        exceeded_budget_items:exceeded.map(item=>item.ownerName),
        requested_evidence:['كشف الحساب الأسبوعي','الإيصالات المتاحة','الرسائل البنكية المتاحة'],
        user_action_required:true,
        external_execution:false,
        execution_boundary:'طلب مطابقة وتحليل فقط؛ لا تنفيذ مالي خارجي',
      })}::jsonb
    )
    returning id
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return {created:Boolean(rows[0]?.id),reason:'CREATED'} as const;
}