export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { syncGovernanceMeetingInvitations } from '@/lib/governance/governance-meeting-scheduler';
import { getRawSql } from '@/infrastructure/db/client';
import { randomUUID } from 'node:crypto';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const schedule=await syncGovernanceMeetingInvitations(user.id);
    return NextResponse.json(schedule);
  }catch(error){
    console.error('[governance-meetings]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'MEETINGS_UNAVAILABLE'},{status:503});
  }
}


function cleanMeetingValue(value:unknown,max=240){
  return typeof value==='string'?value.trim().slice(0,max):'';
}
async function readOverrides(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid and fact_key='meeting_overrides' and status='ACTIVE'
    limit 1
  `;
  const value=rows[0]?.value_json;
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,Record<string,unknown>>:{};
}
async function writeOverrides(userId:string,overrides:Record<string,Record<string,unknown>>){
  const sql=getRawSql();
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,'meeting_overrides','governance',${JSON.stringify(overrides)}::jsonb,
      'USER_STATEMENT',1,now(),ARRAY['governance','meetings'],false,'ACTIVE'
    )
    on conflict(user_id,fact_key) do update set
      value_json=excluded.value_json,source=excluded.source,confidence=1,verified_at=now(),
      uses=excluded.uses,requires_confirmation=false,status='ACTIVE',updated_at=now()
  `;
}

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('meeting-create');
  const payload=await request.json() as Record<string,unknown>;
  const title=cleanMeetingValue(payload.title,160);
  const scheduledAt=cleanMeetingValue(payload.scheduled_at,64);
  const cadence=cleanMeetingValue(payload.cadence,160)||'حسب الحاجة';
  if(!title||Number.isNaN(new Date(scheduledAt).getTime()))return NextResponse.json({code:'MEETING_INVALID'},{status:400});
  const overrides=await readOverrides(user.id);
  const id='custom-'+randomUUID();
  overrides[id]={custom:true,title,scheduled_at:new Date(scheduledAt).toISOString(),cadence,status:'مجدول',kind:'لجنة مؤقتة',agenda:[]};
  await writeOverrides(user.id,overrides);
  return NextResponse.json({ok:true,id});
}

export async function PATCH(request:Request){
  const user=await requireAuthenticatedMutationUser('meeting-update');
  const payload=await request.json() as Record<string,unknown>;
  const id=cleanMeetingValue(payload.id,120);
  const title=cleanMeetingValue(payload.title,160);
  const scheduledAt=cleanMeetingValue(payload.scheduled_at,64);
  const cadence=cleanMeetingValue(payload.cadence,160);
  if(!id||!title||Number.isNaN(new Date(scheduledAt).getTime()))return NextResponse.json({code:'MEETING_INVALID'},{status:400});
  const overrides=await readOverrides(user.id);
  overrides[id]={...(overrides[id]??{}),title,scheduled_at:new Date(scheduledAt).toISOString(),cadence:cadence||'حسب الحاجة'};
  await writeOverrides(user.id,overrides);
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
  const user=await requireAuthenticatedMutationUser('meeting-delete');
  const payload=await request.json() as Record<string,unknown>;
  const id=cleanMeetingValue(payload.id,120);
  if(!id)return NextResponse.json({code:'MEETING_INVALID'},{status:400});
  const overrides=await readOverrides(user.id);
  overrides[id]={...(overrides[id]??{}),deleted:true};
  await writeOverrides(user.id,overrides);
  return NextResponse.json({ok:true});
}
