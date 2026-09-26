export const runtime='nodejs';
export const dynamic='force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';
import { COMPACT_GOVERNANCE_STAGE_FORMS } from '@/lib/governance/compact-governance-forms';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('governance-stage-form');
  try{
    const payload=await request.json().catch(()=>null) as {formId?:unknown;values?:unknown}|null;
    const formId=typeof payload?.formId==='string'?payload.formId.trim():'';
    const values=payload?.values&&typeof payload.values==='object'&&!Array.isArray(payload.values)
      ?payload.values as Record<string,unknown>
      :{};
    const form=COMPACT_GOVERNANCE_STAGE_FORMS.find(item=>item.id===formId);
    if(!form)return NextResponse.json({ok:false,error:'FORM_NOT_FOUND'},{status:404,headers});

    const normalized:Record<string,string>={};
    for(const field of form.fields){
      const raw=values[field.key];
      const value=typeof raw==='string'?raw.trim():raw==null?'':String(raw).trim();
      if(field.required&&!value){
        return NextResponse.json({ok:false,error:'REQUIRED_FIELD_MISSING',field:field.key},{status:422,headers});
      }
      if(value)normalized[field.key]=value.slice(0,4000);
    }

    const sql=getRawSql();
    const threadRows=await sql`
      select id
      from public.conversation_threads
      where user_id=${user.id}::uuid and room_key='central'
      limit 1
    `;
    const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
    if(!threadId)return NextResponse.json({ok:false,error:'CENTRAL_THREAD_NOT_FOUND'},{status:409,headers});

    const submissionId='GF-'+randomUUID().slice(0,8).toUpperCase();
    const body='تم تقديم '+form.title+' ('+submissionId+') ضمن مرحلة '+form.stage+'.';
    await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${threadId}::uuid,${user.id}::uuid,'user',
        'governance-form','نموذج حوكمي','message',${body},
        ${JSON.stringify({
          governance_stage_form:true,
          submission_id:submissionId,
          form_id:form.id,
          procedure_key:form.procedureKey,
          stage:form.stage,
          title:form.title,
          owner:form.owner,
          values:normalized,
          checklist:form.checklist,
          external_execution:false,
        })}::jsonb
      )
    `;
    await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;

    return NextResponse.json({ok:true,submissionId},{headers});
  }catch(error){
    console.error('[governance-stage-form]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({ok:false,error:'FORM_SAVE_FAILED'},{status:500,headers});
  }
}