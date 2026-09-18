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

function rawFact(value:unknown){
  if(!value || typeof value!=='object') return '';
  const raw=(value as Record<string,unknown>).raw;
  return typeof raw==='string' ? raw.trim() : '';
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

  const accountsRaw=rawFact(byKey.get('accounts'));
  if(accountsRaw && !/^(لا يوجد|لايوجد|لا)$/i.test(accountsRaw)){
    for(const line of lines(accountsRaw)){
      const amounts=extractNumbers(line);
      const balance=amounts.at(-1) ?? 0;
      const label=cleanLabel(line) || 'حساب مالي';
      const type=accountType(line);
      const existing=await sql`
        select id
        from public.accounts
        where user_id=${userId}::uuid
          and lower(trim(name))=lower(trim(${label}))
        order by created_at asc
        limit 1
      `;
      let accountId=existing[0]?.id as string|undefined;
      if(!accountId){
        const inserted=await sql`
          insert into public.accounts(user_id,name,account_type,bank_name,financial_role)
          values(${userId}::uuid,${label},${type},${type==='BANK'?label:null},'OPERATING')
          returning id
        `;
        accountId=inserted[0]?.id as string|undefined;
        if(accountId) accountsCreated+=1;
      }
      if(accountId && balance>=0){
        await sql`
          insert into public.account_opening_balances(user_id,account_id,amount,effective_date)
          select ${userId}::uuid,${accountId}::uuid,${balance},current_date
          where not exists(
            select 1
            from public.account_opening_balances
            where user_id=${userId}::uuid
              and account_id=${accountId}::uuid
          )
        `;
      }
    }
  }

  const goalsRaw=rawFact(byKey.get('goals'));
  if(goalsRaw && !/^(لا يوجد|لايوجد|لا)$/i.test(goalsRaw)){
    for(const line of lines(goalsRaw)){
      const amount=extractNumbers(line)[0];
      if(!amount || amount<=0) continue;
      const label=cleanLabel(line) || 'هدف مالي';
      const targetDate=parseTargetDate(line);
      const existing=await sql`
        select id
        from public.financial_goals
        where user_id=${userId}::uuid
          and lower(trim(name))=lower(trim(${label}))
          and status<>'CANCELLED'
        order by created_at asc
        limit 1
      `;
      if(existing[0]?.id) continue;
      await sql`
        insert into public.financial_goals(
          user_id,name,target_amount,target_date,priority,status,start_date,opening_balance
        ) values(
          ${userId}::uuid,${label},${amount},${targetDate},null,'DRAFT',current_date,0
        )
      `;
      goalsCreated+=1;
    }
  }

  const obligationsRaw=rawFact(byKey.get('obligations'));
  if(obligationsRaw && !/^(لا يوجد|لايوجد|لا)$/i.test(obligationsRaw)){
    for(const line of lines(obligationsRaw)){
      const amount=extractNumbers(line)[0];
      if(!amount || amount<=0) continue;
      const label=cleanLabel(line) || 'التزام شهري';
      const existing=await sql`
        select id
        from public.obligation_templates
        where user_id=${userId}::uuid
          and lower(trim(name))=lower(trim(${label}))
          and is_active=true
        order by created_at asc
        limit 1
      `;
      if(existing[0]?.id) continue;
      await sql`
        insert into public.obligation_templates(
          user_id,name,default_amount,recurrence,priority,is_active
        ) values(
          ${userId}::uuid,${label},${amount},'MONTHLY',null,true
        )
      `;
      obligationsCreated+=1;
    }
  }

  const incomeRaw=rawFact(byKey.get('income'));
  const incomeAmount=incomeRaw ? extractNumbers(incomeRaw).find(value=>value>0) : undefined;
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
