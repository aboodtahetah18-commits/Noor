export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';

function addHours(date:Date,hours:number){return new Date(date.getTime()+hours*60*60*1000)}
function addDays(date:Date,days:number){return new Date(date.getTime()+days*24*60*60*1000)}

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const sql=getRawSql();
    const rows=await sql`
      select m.created_at
      from public.conversation_messages m
      join public.conversation_threads t on t.id=m.thread_id
      where m.user_id=${user.id}::uuid
        and t.user_id=${user.id}::uuid
        and t.room_key='central'
        and coalesce(m.structured_data->>'onboarding_complete','false')='true'
      order by m.created_at desc
      limit 1
    `;
    const completedAt=rows[0]?.created_at?new Date(String(rows[0].created_at)):null;
    if(!completedAt) return NextResponse.json({onboarding_complete:false,meetings:[]});
    const cycleRows=await sql`
      select id,start_date::text,expected_next_income_date::text,status,created_at
      from public.financial_cycles
      where user_id=${user.id}::uuid
      order by start_date desc,created_at desc
      limit 1
    `;
    const cycleCountRows=await sql`select count(*)::int as count from public.financial_cycles where user_id=${user.id}::uuid`;
    const cycleCount=Number(cycleCountRows[0]?.count??0);
    const councilAt=addHours(completedAt,24);
    const anchor=cycleRows[0]?.start_date?new Date(String(cycleRows[0].start_date)+'T00:00:00'):new Date(completedAt);
    const thirdCycle=(Math.max(1,cycleCount)%3)===0;
    const meetings=[
      {id:'council-foundation',title:'الاجتماع التأسيسي لمجلس نماء الأعلى',kind:'مجلس',scheduled_at:councilAt.toISOString(),cadence:'مرة واحدة بعد 24 ساعة',status:councilAt>new Date()?'مجدول':'مستحق للمراجعة'},
      {id:'budget-cycle',title:'لجنة الدورة والميزانية والإنفاق',kind:'لجنة دائمة',scheduled_at:addDays(anchor,1).toISOString(),cadence:'اليوم الأول من كل دورة',status:'دوري'},
      {id:'liquidity-cycle',title:'لجنة الاستقرار والسيولة والتمويل',kind:'لجنة دائمة',scheduled_at:addDays(anchor,2).toISOString(),cadence:'اليوم الثاني من كل دورة',status:'دوري'},
      {id:'goals-cycle',title:'لجنة الأهداف والالتزامات',kind:'لجنة دائمة',scheduled_at:addDays(anchor,4).toISOString(),cadence:'اليوم الرابع من كل دورة',status:'دوري'},
      ...(thirdCycle?[{id:'assets-cycle',title:'لجنة الاستثمار والأصول',kind:'لجنة دائمة',scheduled_at:addDays(anchor,7).toISOString(),cadence:'اليوم السابع من كل ثالث دورة',status:'دوري'}]:[]),
      ...(thirdCycle?[{id:'governance-cycle',title:'لجنة السياسات والمخاطر والتدقيق',kind:'لجنة دائمة',scheduled_at:addDays(anchor,10).toISOString(),cadence:'اليوم العاشر من كل ثالث دورة',status:'دوري'}]:[]),
    ];
    return NextResponse.json({onboarding_complete:true,cycle_anchor:anchor.toISOString(),cycle_count:cycleCount,meetings});
  }catch(error){
    console.error('[governance-meetings]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'MEETINGS_UNAVAILABLE'},{status:503});
  }
}
