import { getRawSql } from '@/infrastructure/db/client';
import { extendedProfileSections } from '@/lib/conversations/extended-profile-catalog';
import { getFinancialJourneyStatus } from '@/lib/conversations/financial-journey-orchestrator';

const arabicDigits:Record<string,string>={
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
};

function normalizeDigits(value:string){
  return value.replace(/[٠-٩۰-۹]/g,d=>arabicDigits[d]??d).replace(/[٬,]/g,'');
}

function firstNumber(value:string){
  const match=normalizeDigits(value).match(/\d+(?:\.\d+)?/);
  if(!match)return null;
  const number=Number(match[0]);
  return Number.isFinite(number)&&number>=0?number:null;
}

function noneLike(value:string){
  return /^(لا|لا يوجد|لايوجد|ما عندي|ليس لدي|بدون|صفر)$/i.test(value.trim());
}

function parseValue(kind:string|undefined,options:string[]|undefined,text:string){
  const raw=text.trim();
  if(!raw)return null;
  if(kind==='number'){
    if(noneLike(raw))return 0;
    return firstNumber(raw);
  }
  if(kind==='date'){
    const normalized=normalizeDigits(raw);
    const match=normalized.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
    if(!match)return null;
    const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]);
    const date=new Date(Date.UTC(y,m-1,d));
    if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  if(kind==='select'){
    const option=options?.find(item=>raw.includes(item));
    return option??null;
  }
  return raw.slice(0,2000);
}

export async function captureFinancialJourneyAnswer(userId:string,text:string){
  const before=await getFinancialJourneyStatus(userId);
  if(before.stage!=='DETAILED_PROFILE'||!before.next_field){
    return {captured:false,before,after:before,field:null as null|{label:string;value:unknown}};
  }

  const section=extendedProfileSections.find(item=>item.key===before.next_field?.section_key);
  const field=section?.fields.find(item=>item.key===before.next_field?.key);
  if(!section||!field){
    return {captured:false,before,after:before,field:null as null|{label:string;value:unknown}};
  }

  const value=parseValue(field.kind,field.options,text);
  if(value===null){
    return {captured:false,before,after:before,field:{label:field.label,value:null}};
  }

  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid and fact_key=${'extended:'+section.key} and status='ACTIVE'
    limit 1
  `;
  const current=rows[0]?.value_json&&typeof rows[0].value_json==='object'&&!Array.isArray(rows[0].value_json)
    ?rows[0].value_json as Record<string,unknown>
    :{};
  const next={...current,[field.key]:value};

  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${'extended:'+section.key},${section.key},${JSON.stringify(next)}::jsonb,
      'USER_STATEMENT',1,now(),ARRAY['budget','liquidity','life_memory','advisory'],false,'ACTIVE'
    )
    on conflict(user_id,fact_key) do update set
      value_json=excluded.value_json,source=excluded.source,confidence=1,verified_at=now(),
      uses=excluded.uses,requires_confirmation=false,status='ACTIVE',updated_at=now()
  `;

  const after=await getFinancialJourneyStatus(userId);
  return {captured:true,before,after,field:{label:field.label,value}};
}