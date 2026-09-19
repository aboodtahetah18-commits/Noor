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

function foundationFactDisplay(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value)) return {raw:'',editable:false};
  const record=value as Record<string,unknown>;
  if(typeof record.raw==='string') return {raw:record.raw.trim(),editable:true};

  if(Array.isArray(record.items)){
    const items=record.items.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item));
    if(!items.length) return {raw:'لا يوجد',editable:false};
    const labels=items.map(item=>{
      const name=typeof item.name==='string'?item.name.trim():'';
      const bank=typeof item.bank_name==='string'?item.bank_name.trim():'';
      const amount=
        typeof item.monthly_support==='number'?item.monthly_support:
        typeof item.amount==='number'?item.amount:
        typeof item.target_amount==='number'?item.target_amount:
        typeof item.opening_balance==='number'?item.opening_balance:null;
      const title=name||bank||'عنصر';
      return amount===null?title:`${title} — ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(amount)} ر.س`;
    });
    return {raw:labels.join(' · '),editable:false};
  }

  if(typeof record.actual_net==='number'){
    const net=new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(record.actual_net);
    const base=typeof record.base_salary==='number'
      ? new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(record.base_salary)
      : null;
    return {raw:`الصافي الفعلي ${net} ر.س${base?` · الأساسي ${base} ر.س`:''}`,editable:false};
  }

  return {raw:'بيانات منظمة محفوظة',editable:false};
}


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
      .map(row=>{
        const display=foundationFactDisplay(row.value_json);
        return {
          key:String(row.fact_key),
          label:LABELS[String(row.fact_key)]??String(row.fact_key),
          raw:display.raw,
          editable:display.editable,
          verified_at:row.verified_at,
          confidence:Number(row.confidence??1),
        };
      }),
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
