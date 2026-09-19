import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

export type OpportunityCadence={
  mode:'ACTIVE_DISCOVERY'|'WEEKLY_REVIEW'|'MONTHLY_REVIEW';
  interval_days:number;
  viable_opportunity_count:number;
};

export function resolveOpportunityCadence(viableCount:number):OpportunityCadence{
  const count=Math.max(0,Math.floor(viableCount));
  if(count<=2) return {
    mode:'ACTIVE_DISCOVERY',
    interval_days:count===0?1:count===1?2:3,
    viable_opportunity_count:count,
  };
  if(count===3) return {mode:'WEEKLY_REVIEW',interval_days:7,viable_opportunity_count:count};
  return {mode:'MONTHLY_REVIEW',interval_days:30,viable_opportunity_count:count};
}

export async function syncAssetOpportunityPrompt(userId:string){
  const sql=getRawSql();
  const threads=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='assets'
    limit 1
  `;
  const threadId=threads[0]?.id?String(threads[0].id):null;
  if(!threadId) return null;

  const counts=await sql`
    select count(*)::int as count
    from public.conversation_messages
    where thread_id=${threadId}::uuid
      and user_id=${userId}::uuid
      and structured_data->>'opportunity_status' in ('مناسبة','مناسبة بشروط','قائمة مراقبة')
  `;
  const viableCount=Number(counts[0]?.count??0);
  const cadence=resolveOpportunityCadence(viableCount);

  const latest=await sql`
    select created_at
    from public.conversation_messages
    where thread_id=${threadId}::uuid
      and user_id=${userId}::uuid
      and sender_key='assets-opportunity-scout'
    order by created_at desc
    limit 1
  `;
  const lastAt=latest[0]?.created_at?new Date(String(latest[0].created_at)):null;
  const dueAt=lastAt?new Date(lastAt.getTime()+cadence.interval_days*24*60*60*1000):null;
  if(dueAt&&dueAt>new Date()) return {created:false,cadence,next_due_at:dueAt.toISOString()};

  const body=cadence.mode==='ACTIVE_DISCOVERY'
    ? `قائمة الفرص الصالحة ما زالت محدودة (${viableCount}). أريد فتح جولة بحث جديدة عن فرصة مناسبة لملفك، مع تنويع نوع الفرصة وعدم تكرار المقترحات السابقة. هل تريد أن أبدأ جولة البحث الآن؟`
    : cadence.mode==='WEEKLY_REVIEW'
      ? 'لدينا ثلاث فرص صالحة للمراجعة. سأخفف وتيرة البحث إلى مراجعة أسبوعية حتى نقارن الموجود جيدًا أو تتغير السيولة المؤهلة. هل تريد فتح جولة إضافية قبل الموعد؟'
      : 'لدينا أربع فرص أو أكثر صالحة للمراجعة. سأحوّل البحث إلى متابعة شهرية ما لم تتغير سيولتك أو تطلب أنت جولة جديدة. الأولوية الآن لمقارنة الفرص الحالية بدل تكديس خيارات جديدة.';

  const structured={
    opportunity_search_prompt:true,
    opportunity_status:'REQUESTED_SEARCH',
    cadence_mode:cadence.mode,
    cadence_days:cadence.interval_days,
    viable_opportunity_count:viableCount,
    requires_user_confirmation:true,
    execution_boundary:'research_only_no_investment_execution',
  };
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','assets-opportunity-scout',
      'مدير بنك الأصول الاستثماري','request',${body},${JSON.stringify(structured)}::jsonb
    )
    returning id,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return {created:Boolean(rows[0]?.id),cadence,next_due_at:new Date(Date.now()+cadence.interval_days*24*60*60*1000).toISOString()};
}
