export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';
import {
  parseOnboardingValue,
  validateOnboardingAnswer,
  type OnboardingStep,
} from '@/lib/conversations/governor-onboarding';

const LABELS:Record<string,string>={
  marital_status:'الحالة الاجتماعية',
  dependents:'المعالون',
  home_city:'مدينة السكن',
  housing:'السكن',
  employment:'العمل',
  work_city:'مدينة العمل',
  commute:'التنقل',
  income:'الدخل الشهري',
  accounts:'الحسابات',
  obligations:'الالتزامات',
  goals:'الأهداف',
  statements:'كشوف الحساب',
};

const EDITABLE=new Set(Object.keys(LABELS));

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  const sql=getRawSql();
  const rows=await sql`
    select fact_key,value_json,verified_at,confidence
    from public.user_foundation_facts
    where user_id=${user.id}::uuid
      and status='ACTIVE'
    order by created_at asc
  `;
  return NextResponse.json({
    facts:rows
      .filter(row=>EDITABLE.has(String(row.fact_key)))
      .map(row=>({
        key:String(row.fact_key),
        label:LABELS[String(row.fact_key)]??String(row.fact_key),
        raw:
          row.value_json && typeof row.value_json==='object' && 'raw' in row.value_json
            ? String((row.value_json as Record<string,unknown>).raw??'')
            : '',
        verified_at:row.verified_at,
        confidence:Number(row.confidence??1),
      })),
  });
}

export async function PATCH(request:Request){
  const user=await requireAuthenticatedMutationUser('onboarding-review-edit');
  try{
    const body=await request.json() as Record<string,unknown>;
    const key=typeof body.key==='string'?body.key.trim():'';
    const raw=typeof body.raw==='string'?body.raw.trim():'';
    if(!EDITABLE.has(key)) return NextResponse.json({code:'ONBOARDING_FACT_NOT_EDITABLE'},{status:400});

    const validation=validateOnboardingAnswer(key as OnboardingStep,raw);
    if(validation) return NextResponse.json({code:'ONBOARDING_FACT_INVALID',message:validation},{status:400});

    const sql=getRawSql();
    const existing=await sql`
      select id
      from public.user_foundation_facts
      where user_id=${user.id}::uuid
        and fact_key=${key}
        and status='ACTIVE'
      limit 1
    `;
    if(!existing[0]?.id) return NextResponse.json({code:'ONBOARDING_FACT_NOT_FOUND'},{status:404});

    const parsed=parseOnboardingValue(key as OnboardingStep,raw);
    await sql`
      update public.user_foundation_facts
      set value_json=${JSON.stringify(parsed)}::jsonb,
          source='USER_STATEMENT',
          confidence=1,
          verified_at=now(),
          requires_confirmation=false,
          updated_at=now()
      where id=${String(existing[0].id)}::uuid
        and user_id=${user.id}::uuid
    `;

    return NextResponse.json({ok:true,key,label:LABELS[key],raw});
  }catch{
    return NextResponse.json({code:'ONBOARDING_REVIEW_UPDATE_FAILED'},{status:503});
  }
}
