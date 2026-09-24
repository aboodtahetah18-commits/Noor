import { getRawSql } from '@/infrastructure/db/client';

type ProjectionSummary = {
  accounts_created:number;
  goals_created:number;
  obligations_created:number;
  incomes_created:number;
  income_deferred:boolean;
};

function normalizeArabicNumber(input:string){
  const map:Record<string,string>={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  return input.replace(/[٠-٩]/g,d=>map[d]??d).replace(/[٬,]/g,'');
}

function extractNumbers(input:string){
  return [...normalizeArabicNumber(input).matchAll(/\d+(?:\.\d+)?/g)]
    .map(match=>Number(match[0]))
    .filter(value=>Number.isFinite(value));
}

function lines(raw:string){
  return raw.split(/\n|،/).map(value=>value.trim()).filter(Boolean);
}

function cleanLabel(raw:string){
  return raw
    .replace(/[\d٠-٩.,٬]+(?:\.\d+)?\s*(?:ريال|ر\.س)?/gi,' ')
    .replace(/\b(?:حساب|جاري|ادخار|توفير|نقدي|نقد|بنك)\b/gi,' ')
    .replace(/[-—:|]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function accountType(raw:string){
  if(/ادخار|توفير/i.test(raw)) return 'SAVINGS';
  if(/نقدي|نقد|كاش|cash/i.test(raw)) return 'CASH';
  return 'BANK';
}

function parseTargetDate(raw:string){
  const normalized=normalizeArabicNumber(raw);
  const match=normalized.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  if(!match) return null;
  const year=Number(match[1]);
  const month=Number(match[2]);
  const day=Number(match[3]);
  const candidate=new Date(Date.UTC(year,month-1,day));
  if(
    candidate.getUTCFullYear()!==year ||
    candidate.getUTCMonth()!==month-1 ||
    candidate.getUTCDate()!==day
  ) return null;
  const today=new Date();
  const todayIso=[
    today.getUTCFullYear(),
    String(today.getUTCMonth()+1).padStart(2,'0'),
    String(today.getUTCDate()).padStart(2,'0'),
  ].join('-');
  const iso=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return iso>=todayIso ? iso : null;
}

function factRecord(value:unknown){
  return value&&typeof value==='object'&&!Array.isArray(value) ? value as Record<string,unknown> : null;
}

function factItems(value:unknown){
  const record=factRecord(value);
  return record&&Array.isArray(record.items)
    ? record.items.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item))
    : [];
}

function rawFact(value:unknown){
  const record=factRecord(value);
  const raw=record?.raw;
  return typeof raw==='string' ? raw.trim() : '';
}


async function readConfirmedAccountFact(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and status='ACTIVE'
      and fact_key='accounts'
    limit 1
  `;
  return rows[0]?.value_json;
}

export async function reconcileConfirmedOnboardingAccounts(userId:string):Promise<number>{
  const sql=getRawSql();
  const accountFact=await readConfirmedAccountFact(userId);
  const structuredAccounts=factItems(accountFact);
  const accountInputs=structuredAccounts.length
    ? structuredAccounts.map(item=>({
        label:String(item.short_identifier||item.bank_name||'حساب مالي').trim(),
        bankName:String(item.bank_name||'').trim()||null,
        type:String(item.account_type||'BANK').trim().toUpperCase(),
        balance:Number(item.opening_balance??0),
        included:item.included_in_namaa!==false,
        iban:typeof item.iban==='string'?item.iban.replace(/\s+/g,'').toUpperCase():null,
        cardLast4:typeof item.card_last4==='string'?item.card_last4.trim():null,
      }))
    : lines(rawFact(accountFact)).map(line=>({
        label:cleanLabel(line)||'حساب مالي',
        bankName:cleanLabel(line)||null,
        type:accountType(line),
        balance:extractNumbers(line).at(-1)??0,
        included:true,
        iban:null,
        cardLast4:null,
      }));

  let created=0;
  for(const input of accountInputs){
    if(!input.included) continue;
    const label=input.label||input.bankName||'حساب مالي';
    const existing=input.iban
      ? await sql`
          select id
          from public.accounts
          where user_id=${userId}::uuid
            and upper(replace(coalesce(iban,''),' ',''))=${input.iban}
          order by created_at asc
          limit 1
        `
      : input.cardLast4
        ? await sql`
            select id
            from public.accounts
            where user_id=${userId}::uuid
              and lower(trim(name))=lower(trim(${label}))
              and coalesce(lower(trim(bank_name)),'')=coalesce(lower(trim(${input.bankName})), '')
              and card_last4=${input.cardLast4}
            order by created_at asc
            limit 1
          `
        : await sql`
            select id
            from public.accounts
            where user_id=${userId}::uuid
              and lower(trim(name))=lower(trim(${label}))
              and coalesce(lower(trim(bank_name)),'')=coalesce(lower(trim(${input.bankName})), '')
            order by created_at asc
            limit 1
          `;

    let accountId=existing[0]?.id as string|undefined;
    if(!accountId){
      const inserted=await sql`
        insert into public.accounts(user_id,name,account_type,bank_name,iban,account_number,card_last4,financial_role)
        values(
          ${userId}::uuid,${label},${input.type},${input.bankName},
          ${input.iban},${input.iban?input.iban.slice(6):null},${input.cardLast4},'OPERATING'
        )
        returning id
      `;
      accountId=inserted[0]?.id as string|undefined;
      if(accountId) created+=1;
    }

    if(accountId && Number.isFinite(input.balance) && input.balance>=0){
      await sql`
        insert into public.account_opening_balances(user_id,account_id,amount,effective_date)
        select ${userId}::uuid,${accountId}::uuid,${input.balance},current_date
        where not exists(
          select 1
          from public.account_opening_balances
          where user_id=${userId}::uuid
            and account_id=${accountId}::uuid
        )
      `;
    }
  }
  return created;
}

export async function projectConfirmedOnboardingFacts(userId:string):Promise<ProjectionSummary>{
  const sql=getRawSql();
  const facts=await sql`
    select fact_key,value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and status='ACTIVE'
      and fact_key in ('accounts','goals','obligations','income')
  `;

  const byKey=new Map<string,unknown>();
  for(const row of facts) byKey.set(String(row.fact_key),row.value_json);

  let accountsCreated=0;
  let goalsCreated=0;
  let obligationsCreated=0;
  let incomesCreated=0;
  let incomeDeferred=false;

  accountsCreated=await reconcileConfirmedOnboardingAccounts(userId);

  const goalFact=byKey.get('goals');
  const structuredGoals=factItems(goalFact);
  const goalInputs=structuredGoals.length
    ? structuredGoals.map(item=>({
        label:String(item.name||'هدف مالي').trim(),
        amount:Number(item.target_amount??0),
        targetDate:typeof item.target_date==='string'?item.target_date:null,
        allocated:Number(item.allocated_amount??0),
      }))
    : lines(rawFact(goalFact)).map(line=>({
        label:cleanLabel(line)||'هدف مالي',
        amount:extractNumbers(line)[0]??0,
        targetDate:parseTargetDate(line),
        allocated:0,
      }));

  for(const input of goalInputs){
    if(!Number.isFinite(input.amount)||input.amount<=0) continue;
    const existing=await sql`
      select id
      from public.financial_goals
      where user_id=${userId}::uuid
        and lower(trim(name))=lower(trim(${input.label}))
        and status<>'CANCELLED'
      order by created_at asc
      limit 1
    `;
    if(existing[0]?.id) continue;
    await sql`
      insert into public.financial_goals(
        user_id,name,target_amount,target_date,priority,status,start_date,opening_balance
      ) values(
        ${userId}::uuid,${input.label},${input.amount},${input.targetDate},null,'DRAFT',current_date,${Math.max(0,input.allocated)}
      )
    `;
    goalsCreated+=1;
  }

  const obligationFact=byKey.get('obligations');
  const structuredObligations=factItems(obligationFact);
  const obligationInputs=structuredObligations.length
    ? structuredObligations.map(item=>({
        label:String(item.name||'التزام').trim(),
        amount:Number(item.amount??0),
        recurrence:String(item.recurrence||'MONTHLY').trim().toUpperCase(),
      }))
    : lines(rawFact(obligationFact)).map(line=>({
        label:cleanLabel(line)||'التزام شهري',
        amount:extractNumbers(line)[0]??0,
        recurrence:'MONTHLY',
      }));

  for(const input of obligationInputs){
    if(!Number.isFinite(input.amount)||input.amount<=0) continue;
    const existing=await sql`
      select id
      from public.obligation_templates
      where user_id=${userId}::uuid
        and lower(trim(name))=lower(trim(${input.label}))
        and is_active=true
      order by created_at asc
      limit 1
    `;
    if(existing[0]?.id) continue;
    await sql`
      insert into public.obligation_templates(
        user_id,name,default_amount,recurrence,priority,is_active
      ) values(
        ${userId}::uuid,${input.label},${input.amount},${input.recurrence},null,true
      )
    `;
    obligationsCreated+=1;
  }

  const incomeFact=byKey.get('income');
  const incomeRecord=factRecord(incomeFact);
  const structuredIncome=incomeRecord&&typeof incomeRecord.actual_net==='number' ? incomeRecord.actual_net : undefined;
  const incomeRaw=rawFact(incomeFact);
  const incomeAmount=typeof structuredIncome==='number'&&structuredIncome>0
    ? structuredIncome
    : incomeRaw ? extractNumbers(incomeRaw).find(value=>value>0) : undefined;
  if(incomeAmount){
    const cycles=await sql`
      select id,expected_next_income_date,status
      from public.financial_cycles
      where user_id=${userId}::uuid
        and status in ('ACTIVE','DRAFT')
      order by case when status='ACTIVE' then 0 else 1 end, created_at desc
      limit 1
    `;
    const cycle=cycles[0];
    if(cycle?.id){
      const existing=await sql`
        select id
        from public.expected_incomes
        where user_id=${userId}::uuid
          and cycle_id=${String(cycle.id)}::uuid
          and source_name='دخل التأسيس'
        limit 1
      `;
      if(!existing[0]?.id){
        await sql`
          insert into public.expected_incomes(
            user_id,cycle_id,source_name,expected_amount,expected_date,income_kind,is_primary
          ) values(
            ${userId}::uuid,${String(cycle.id)}::uuid,'دخل التأسيس',${incomeAmount},
            ${String(cycle.expected_next_income_date)},'SALARY',true
          )
        `;
        incomesCreated+=1;
      }
    }else{
      incomeDeferred=true;
    }
  }

  return {
    accounts_created:accountsCreated,
    goals_created:goalsCreated,
    obligations_created:obligationsCreated,
    incomes_created:incomesCreated,
    income_deferred:incomeDeferred,
  };
}
