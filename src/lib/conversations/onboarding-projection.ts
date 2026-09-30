import { getRawSql } from '@/infrastructure/db/client';
import { reconcileConfirmedOnboardingAccounts } from '@/lib/conversations/onboarding-account-reconciliation';
import { financialPlanRepository } from '@/repositories/financial-plan-repository';

type ProjectionSummary = {
  accounts_created:number;
  goals_created:number;
  obligations_created:number;
  incomes_created:number;
  income_deferred:boolean;
  budget_draft_created:boolean;
  budget_draft_id:string|null;
  budget_draft_items:number;
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

function positiveNumber(value:unknown){
  const number=Number(value);
  return Number.isFinite(number)&&number>0 ? number : 0;
}

function monthlyAmountFromFlexibleItem(item:Record<string,unknown>){
  const direct=positiveNumber(item.expected_current_month);
  if(direct>0) return direct;

  const mode=String(item.amount_mode??'');
  let amount=positiveNumber(item.amount);
  if(mode==='نطاق من–إلى'){
    amount=positiveNumber(item.amount_max)||positiveNumber(item.amount_min);
  }
  if(amount<=0) return 0;

  const recurrenceMode=String(item.recurrence_mode??'متكرر');
  if(recurrenceMode==='مرة واحدة') return amount;
  if(recurrenceMode==='حسب الحاجة'||recurrenceMode==='غير منتظم'){
    const reserve=positiveNumber(item.monthly_reserve);
    const annual=positiveNumber(item.annual_estimate);
    return reserve||annual/12;
  }

  const every=Math.max(1,positiveNumber(item.recurrence_every)||1);
  const unit=String(item.recurrence_unit??'شهر');
  if(unit==='يوم') return amount*(30/every);
  if(unit==='أسبوع') return amount*(52/12/every);
  if(unit==='سنة') return amount/(12*every);
  return amount/every;
}

function normalizeBudgetPriorityLabel(value:string){
  return value
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function suggestBudgetPriority(allocationType:'OBLIGATION'|'ESSENTIAL'|'SAVING'|'EMERGENCY'|'GOAL'|'FLEXIBLE',name:string){
  if(allocationType==='OBLIGATION'||allocationType==='ESSENTIAL') return 'NECESSARY' as const;
  if(allocationType==='SAVING'||allocationType==='EMERGENCY'||allocationType==='GOAL') return 'IMPORTANT' as const;
  const normalized=name.trim().toLocaleLowerCase('ar');
  if(/ترفيه|سينما|ألعاب|العاب|منصة مشاهدة|نتفلكس|شاهد|سبوتيفاي/.test(normalized)) return 'ENTERTAINMENT' as const;
  return 'OPTIONAL' as const;
}

function recurringRuleFromFlexibleItem(item:Record<string,unknown>,cycleStartDate:string){
  const mode=String(item.recurrence_mode??'متكرر');
  const every=Math.max(1,Math.round(positiveNumber(item.recurrence_every)||1));
  const unit=String(item.recurrence_unit??'شهر');

  if(mode==='مرة واحدة'){
    return {recurrenceKind:'ONE_TIME' as const,intervalCycles:1,startCycleDate:cycleStartDate};
  }
  if(mode==='حسب الحاجة'||mode==='غير منتظم'){
    return {recurrenceKind:'SEASONAL' as const,intervalCycles:1,startCycleDate:cycleStartDate};
  }
  if(unit==='شهر'&&every>1){
    return {recurrenceKind:'EVERY_N_CYCLES' as const,intervalCycles:Math.min(24,every),startCycleDate:cycleStartDate};
  }
  if(unit==='سنة'){
    return {recurrenceKind:'EVERY_N_CYCLES' as const,intervalCycles:Math.min(24,every*12),startCycleDate:cycleStartDate};
  }
  return {recurrenceKind:'MONTHLY' as const,intervalCycles:1,startCycleDate:cycleStartDate};
}

export async function projectConfirmedOnboardingFacts(userId:string):Promise<ProjectionSummary>{
  const sql=getRawSql();
  const facts=await sql`
    select fact_key,value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and status='ACTIVE'
      and fact_key in ('accounts','goals','obligations','income','housing','bills','subscriptions','dependents')
  `;

  const byKey=new Map<string,unknown>();
  for(const row of facts) byKey.set(String(row.fact_key),row.value_json);

  let accountsCreated=0;
  let goalsCreated=0;
  let obligationsCreated=0;
  let incomesCreated=0;
  let incomeDeferred=false;
  let budgetDraftCreated=false;
  let budgetDraftId:string|null=null;
  let budgetDraftItems=0;

  const accountFact=byKey.get('accounts');
  const structuredAccounts=factItems(accountFact);
  const accountInputs=structuredAccounts.length
    ? structuredAccounts.map(item=>({
        label:String(item.short_identifier||item.bank_name||'حساب مالي').trim(),
        bankName:String(item.bank_name||'').trim()||null,
        type:String(item.account_type||'BANK').trim().toUpperCase(),
        balance:Number(item.opening_balance??0),
        included:item.included_in_namaa!==false,
      }))
    : lines(rawFact(accountFact)).map(line=>({
        label:cleanLabel(line)||'حساب مالي',
        bankName:cleanLabel(line)||null,
        type:accountType(line),
        balance:extractNumbers(line).at(-1)??0,
        included:true,
      }));

  for(const input of accountInputs){
    if(!input.included) continue;
    const label=input.label||input.bankName||'حساب مالي';
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
        values(${userId}::uuid,${label},${input.type},${input.bankName},'OPERATING')
        returning id
      `;
      accountId=inserted[0]?.id as string|undefined;
      if(accountId) accountsCreated+=1;
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

  const reconciliation=await reconcileConfirmedOnboardingAccounts(userId);
  accountsCreated+=reconciliation.created;

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

  const cycleRows=await sql`
    select id,start_date::text
    from public.financial_cycles
    where user_id=${userId}::uuid and status in ('ACTIVE','DRAFT')
    order by case when status='ACTIVE' then 0 else 1 end,created_at desc
    limit 1
  `;
  const cycle=cycleRows[0] as Record<string,unknown>|undefined;

  if(cycle?.id){
    const cycleId=String(cycle.id);
    const cycleStartDate=String(cycle.start_date);
    const existingPlan=await sql`
      select id
      from public.financial_plans
      where user_id=${userId}::uuid and cycle_id=${cycleId}::uuid
      limit 1
    `;

    const existingPlanRow=existingPlan[0] as Record<string,unknown>|undefined;

    const learnedPriorityByKey=new Map<string,'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT'>();
    let learnedFlexiblePriority:'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT'|null=null;
    const priorityTable=await sql`select to_regclass('public.budget_priority_preferences')::text table_name`;
    if((priorityTable[0] as Record<string,unknown>|undefined)?.table_name){
      const preferenceRows=await sql`
        select normalized_label,allocation_type,chosen_priority,confirmation_count,correction_count
        from public.budget_priority_preferences
        where user_id=${userId}::uuid
      `;
      const flexibleCounts=new Map<'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT',number>();
      const unstableKeys=new Set<string>();
      for(const row of preferenceRows){
        const allocationType=String(row.allocation_type??'');
        const normalizedLabel=String(row.normalized_label??'');
        const priority=String(row.chosen_priority??'') as 'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT';
        if(!['NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT'].includes(priority)) continue;
        const confirmations=Math.max(1,Number(row.confirmation_count??1));
        const corrections=Math.max(0,Number(row.correction_count??0));
        const unstable=corrections>=2&&corrections/confirmations>=0.4;
        const key=`${allocationType}:${normalizedLabel}`;
        if(unstable){
          unstableKeys.add(key);
          continue;
        }
        learnedPriorityByKey.set(key,priority);
        if(allocationType==='FLEXIBLE'){
          flexibleCounts.set(priority,(flexibleCounts.get(priority)??0)+confirmations);
        }
      }
      const total=[...flexibleCounts.values()].reduce((sum,value)=>sum+value,0);
      const leader=[...flexibleCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
      if(total>=3&&leader&&leader[1]/total>=0.7) learnedFlexiblePriority=leader[0];
    }

    const resolveSuggestedPriority=(allocationType:'OBLIGATION'|'ESSENTIAL'|'SAVING'|'EMERGENCY'|'GOAL'|'FLEXIBLE',name:string)=>{
      const key=`${allocationType}:${normalizeBudgetPriorityLabel(name)}`;
      if(unstableKeys.has(key)) return null;
      const exact=learnedPriorityByKey.get(key);
      if(exact) return exact;
      if(allocationType==='FLEXIBLE'&&learnedFlexiblePriority) return learnedFlexiblePriority;
      return suggestBudgetPriority(allocationType,name);
    };

    if(!existingPlanRow?.id){
      const items:Array<{
        name:string;
        allocationType:'OBLIGATION'|'ESSENTIAL'|'SAVING'|'EMERGENCY'|'GOAL'|'FLEXIBLE';
        plannedAmount:string;
        recurrenceKind:'MONTHLY'|'EVERY_N_CYCLES'|'ONE_TIME'|'SEASONAL';
        intervalCycles:number;
        startCycleDate:string;
        note:string;
        suggestedPriority:'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT'|null;
      }>=[];

      const housing=factRecord(byKey.get('housing'));
      if(housing){
        const housingAmount=positiveNumber(housing.monthly_housing_cost);
        if(housingAmount>0){
          items.push({
            name:String(housing.housing_type||'السكن'),
            allocationType:'ESSENTIAL',
            plannedAmount:housingAmount.toFixed(2),
            recurrenceKind:'MONTHLY',
            intervalCycles:1,
            startCycleDate:cycleStartDate,
            note:'مسودة تأسيسية من بيانات السكن — تحتاج مراجعة قبل الاعتماد.',
            suggestedPriority:resolveSuggestedPriority('ESSENTIAL',String(housing.housing_type||'السكن')),
          });
        }
      }

      for(const item of factItems(byKey.get('obligations'))){
        const amount=positiveNumber(item.amount);
        if(amount<=0) continue;
        const recurrence=String(item.recurrence??'MONTHLY').toUpperCase();
        const rule=recurrence==='YEARLY'
          ? {recurrenceKind:'EVERY_N_CYCLES' as const,intervalCycles:12,startCycleDate:cycleStartDate}
          : recurrence==='ONE_TIME'
            ? {recurrenceKind:'ONE_TIME' as const,intervalCycles:1,startCycleDate:cycleStartDate}
            : {recurrenceKind:'MONTHLY' as const,intervalCycles:1,startCycleDate:cycleStartDate};
        items.push({
          name:String(item.name||'التزام'),
          allocationType:'OBLIGATION',
          plannedAmount:amount.toFixed(2),
          ...rule,
          note:'مسودة تأسيسية من الالتزامات المؤكدة — تحتاج مراجعة قبل الاعتماد.',
          suggestedPriority:resolveSuggestedPriority('OBLIGATION',String(item.name||'التزام')),
        });
      }

      for(const [factKey,allocationType] of [['bills','ESSENTIAL'],['subscriptions','FLEXIBLE']] as const){
        for(const item of factItems(byKey.get(factKey))){
          const amount=monthlyAmountFromFlexibleItem(item);
          if(amount<=0) continue;
          const rule=recurringRuleFromFlexibleItem(item,cycleStartDate);
          items.push({
            name:String(item.name|| (factKey==='bills'?'فاتورة':'اشتراك')),
            allocationType,
            plannedAmount:amount.toFixed(2),
            ...rule,
            note:'مسودة تأسيسية من بيانات '+(factKey==='bills'?'الفواتير':'الاشتراكات')+' — تحتاج مراجعة قبل الاعتماد.',
            suggestedPriority:resolveSuggestedPriority(allocationType,String(item.name|| (factKey==='bills'?'فاتورة':'اشتراك'))),
          });
        }
      }

      const dependentItems=factItems(byKey.get('dependents'));
      const dependentMonthly=dependentItems.reduce((sum,item)=>{
        const monthly=positiveNumber(item.monthly_support);
        const annual=positiveNumber(item.annual_support);
        return sum+monthly+(annual/12);
      },0);
      if(dependentMonthly>0){
        items.push({
          name:'دعم الأسرة والمعالين',
          allocationType:'ESSENTIAL',
          plannedAmount:dependentMonthly.toFixed(2),
          recurrenceKind:'MONTHLY',
          intervalCycles:1,
          startCycleDate:cycleStartDate,
          note:'مسودة تأسيسية مجمعة من دعم المعالين — تحتاج مراجعة قبل الاعتماد.',
          suggestedPriority:resolveSuggestedPriority('ESSENTIAL','دعم الأسرة والمعالين'),
        });
      }

      const priority={OBLIGATION:3,ESSENTIAL:2,FLEXIBLE:1,SAVING:0,EMERGENCY:0,GOAL:0} as const;
      const byName=new Map<string,(typeof items)[number]>();
      for(const item of items){
        const key=item.name.trim().toLocaleLowerCase('ar');
        const previous=byName.get(key);
        if(!previous||priority[item.allocationType]>priority[previous.allocationType]) byName.set(key,item);
      }
      const deduped=[...byName.values()];

      if(deduped.length){
        budgetDraftId=await financialPlanRepository.createDraftWithManualCategories(userId,cycleId,deduped);
        budgetDraftCreated=true;
        budgetDraftItems=deduped.length;
      }
    }else{
      budgetDraftId=String(existingPlanRow.id);
    }
  }

  return {
    accounts_created:accountsCreated,
    goals_created:goalsCreated,
    obligations_created:obligationsCreated,
    incomes_created:incomesCreated,
    income_deferred:incomeDeferred,
    budget_draft_created:budgetDraftCreated,
    budget_draft_id:budgetDraftId,
    budget_draft_items:budgetDraftItems,
  };
}
