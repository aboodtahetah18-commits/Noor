export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';
import { extendedProfileSections } from '@/lib/conversations/extended-profile-catalog';

const allowed=new Map(extendedProfileSections.map(section=>[section.key,new Set(section.fields.map(field=>field.key))]));

function cleanValue(value:unknown){
  if(typeof value==='number'&&Number.isFinite(value)) return value;
  if(typeof value==='string') return value.trim().slice(0,2000);
  return null;
}

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const sql=getRawSql();
    const rows=await sql`
      select fact_key,value_json,confidence,verified_at,updated_at
      from public.user_foundation_facts
      where user_id=${user.id}::uuid
        and status='ACTIVE'
        and fact_key like 'extended:%'
      order by updated_at desc,created_at desc
    `;
    const facts:Object=Object.fromEntries(rows.map(row=>[
      String(row.fact_key).replace(/^extended:/,''),
      {value:row.value_json,confidence:Number(row.confidence??1),verified_at:row.verified_at,updated_at:row.updated_at},
    ]));
    return NextResponse.json({sections:extendedProfileSections,facts});
  }catch(error){
    console.error('[extended-profile-read]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'EXTENDED_PROFILE_UNAVAILABLE'},{status:503});
  }
}

export async function PUT(request:Request){
  const user=await requireAuthenticatedMutationUser('extended-profile-update');
  try{
    const payload=await request.json() as {section?:unknown;values?:unknown};
    const section=typeof payload.section==='string'?payload.section:'';
    const fieldSet=allowed.get(section);
    if(!fieldSet||!payload.values||typeof payload.values!=='object'||Array.isArray(payload.values)){
      return NextResponse.json({code:'EXTENDED_PROFILE_INVALID'},{status:400});
    }
    const values:Record<string,unknown>={};
    for(const [key,value] of Object.entries(payload.values as Record<string,unknown>)){
      if(!fieldSet.has(key)) continue;
      const cleaned=cleanValue(value);
      if(cleaned!==null&&cleaned!=='') values[key]=cleaned;
    }
    const sql=getRawSql();
    await sql`
      insert into public.user_foundation_facts(
        user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
      ) values(
        ${user.id}::uuid,${'extended:'+section},${section},${JSON.stringify(values)}::jsonb,
        'USER_STATEMENT',1,now(),ARRAY['budget','liquidity','life_memory','advisory'],false,'ACTIVE'
      )
      on conflict(user_id,fact_key) do update set
        value_json=excluded.value_json,source=excluded.source,confidence=1,verified_at=now(),
        uses=excluded.uses,requires_confirmation=false,status='ACTIVE',updated_at=now()
    `;
    return NextResponse.json({ok:true,section,value:values});
  }catch(error){
    console.error('[extended-profile-write]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'EXTENDED_PROFILE_WRITE_FAILED'},{status:503});
  }
}
