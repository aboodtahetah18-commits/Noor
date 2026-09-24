import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

type FoundationAccount={
  bank_name?:unknown;
  account_type?:unknown;
  short_identifier?:unknown;
  iban?:unknown;
  card_last4?:unknown;
  opening_balance?:unknown;
  included_in_namaa?:unknown;
};

function clean(value:unknown){
  return typeof value==='string'?value.trim():'';
}
function normalize(value:string){
  return value.trim().toLocaleLowerCase('ar');
}
function normalizeIban(value:string){
  return value.replace(/\s+/g,'').toUpperCase();
}
function accountType(value:unknown){
  const raw=String(value??'BANK').trim().toUpperCase();
  return ['BANK','SAVINGS','CASH','OTHER'].includes(raw)?raw:'OTHER';
}
function typeLabel(type:string){
  return type==='SAVINGS'?'ادخار':type==='CASH'?'نقدي':type==='OTHER'?'آخر':'جاري';
}

export async function reconcileConfirmedOnboardingAccounts(userId:string){
  const sql=getRawSql();
  const facts=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid and fact_key='accounts' and status='ACTIVE'
    limit 1
  `;
  const record=facts[0]?.value_json;
  if(!record||typeof record!=='object'||Array.isArray(record)) return {created:0,total:0};
  const rawItems=(record as Record<string,unknown>).items;
  if(!Array.isArray(rawItems)) return {created:0,total:0};

  const usedLabels=new Map<string,number>();
  const inputs=rawItems.flatMap((raw,index)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw)) return [];
    const item=raw as FoundationAccount;
    if(item.included_in_namaa===false) return [];
    const bankName=clean(item.bank_name);
    if(!bankName) return [];
    const type=accountType(item.account_type);
    const shortIdentifier=clean(item.short_identifier);
    const iban=normalizeIban(clean(item.iban));
    const cardLast4=clean(item.card_last4).replace(/\D/g,'').slice(-4);
    const amount=Number(item.opening_balance??0);
    const balance=Number.isFinite(amount)&&amount>=0?amount:0;
    let label=shortIdentifier
      ||(cardLast4?bankName+' •••• '+cardLast4:'')
      ||(iban?bankName+' · '+iban.slice(-4):'')
      ||bankName+' · '+typeLabel(type)+' '+String(index+1);
    const key=normalize(label);
    const count=(usedLabels.get(key)??0)+1;
    usedLabels.set(key,count);
    if(count>1) label=label+' ('+String(count)+')';
    return [{bankName,type,shortIdentifier,iban,cardLast4,balance,label}];
  });

  if(!inputs.length) return {created:0,total:0};

  const existingRows=await sql`
    select a.id,a.name,a.account_type,a.bank_name,a.iban,a.card_last4,a.created_at,
      ob.id as opening_balance_id
    from public.accounts a
    left join public.account_opening_balances ob on ob.account_id=a.id and ob.user_id=a.user_id
    where a.user_id=${userId}::uuid and a.is_active=true
    order by a.created_at asc
  `;
  const claimed=new Set<string>();
  let created=0;

  for(const input of inputs){
    const available=existingRows.filter(row=>!claimed.has(String(row.id)));
    const byIban=input.iban
      ?available.find(row=>normalizeIban(String(row.iban??''))===input.iban)
      :undefined;
    const byCard=input.cardLast4
      ?available.find(row=>String(row.card_last4??'')===input.cardLast4&&normalize(String(row.bank_name??''))===normalize(input.bankName))
      :undefined;
    const byName=available.find(row=>normalize(String(row.name??''))===normalize(input.label));
    const byBankType=available.find(row=>normalize(String(row.bank_name??''))===normalize(input.bankName)&&String(row.account_type??'').toUpperCase()===input.type);
    const matched=byIban??byCard??byName??byBankType;

    if(matched){
      const id=String(matched.id);
      claimed.add(id);
      if(!matched.opening_balance_id){
        await sql`
          insert into public.account_opening_balances(id,user_id,account_id,amount,effective_date)
          values(${randomUUID()},${userId}::uuid,${id}::uuid,${input.balance},current_date)
        `;
      }
      continue;
    }

    const accountId=randomUUID();
    await sql.transaction([
      sql`
        insert into public.accounts(
          id,user_id,name,account_type,bank_name,iban,card_last4,currency,is_active
        ) values(
          ${accountId},${userId}::uuid,${input.label},${input.type},${input.bankName},
          ${input.iban||null},${input.cardLast4||null},'SAR',true
        )
      `,
      sql`
        insert into public.account_opening_balances(
          id,user_id,account_id,amount,effective_date
        ) values(
          ${randomUUID()},${userId}::uuid,${accountId},${input.balance},current_date
        )
      `,
    ]);
    existingRows.push({
      id:accountId,name:input.label,account_type:input.type,bank_name:input.bankName,
      iban:input.iban||null,card_last4:input.cardLast4||null,created_at:new Date().toISOString(),
      opening_balance_id:true,
    });
    claimed.add(accountId);
    created+=1;
  }

  return {created,total:inputs.length};
}
