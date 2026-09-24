import { getRawSql } from '@/infrastructure/db/client';
import { getFinancialJourneyStatus } from '@/lib/conversations/financial-journey-orchestrator';
import { getGovernorPreMeetingBrief } from '@/lib/allocation/governor-pre-meeting-brief';
import { getFinancialMeetingOpeningAgenda } from '@/lib/allocation/financial-meeting-opening-agenda';
import { buildFinancialResponsibilityClaims, getFinancialCycleAllocationSnapshot } from '@/lib/allocation/financial-cycle-allocation-engine';

export type FoundingBudgetLine={
  key:string;
  title:string;
  monthlyAmount:number;
  source:string[];
  protected:boolean;
};

export type FoundingAccountBucket={
  key:string;
  title:string;
  purpose:string;
  preferredGrouping:'SEPARATE_ACCOUNT'|'SHARED_BANK_SEPARATE_ACCOUNT'|'EXISTING_ACCOUNT_OK';
  amount:number|null;
  owner:string;
};

export type FoundingFinancialMeetingPack={
  ready:boolean;
  completionPercent:number;
  preparedAt:string;
  participants:Array<{key:string;name:string;role:string}>;
  financialSnapshot:Awaited<ReturnType<typeof getFinancialCycleAllocationSnapshot>>;
  claims:ReturnType<typeof buildFinancialResponsibilityClaims>;
  governorBrief:Awaited<ReturnType<typeof getGovernorPreMeetingBrief>>;
  agenda:Awaited<ReturnType<typeof getFinancialMeetingOpeningAgenda>>;
  budgetDraft:{
    income:number|null;
    lines:FoundingBudgetLine[];
    knownMonthlyOutflow:number;
    unallocated:number|null;
    complete:boolean;
  };
  accountBuckets:FoundingAccountBucket[];
  safeguards:{
    userApprovalRequired:true;
    noBankTransfer:true;
    noExternalExecution:true;
  };
};

function amount(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)&&n>=0?n:0;
}

function monthlyFromTextRecord(record:Record<string,unknown>,keys:string[]){
  return keys.reduce((sum,key)=>sum+amount(record[key]),0);
}

function textMonthlyEstimate(value:unknown){
  if(typeof value!=='string')return 0;
  const numbers=[...value.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0])).filter(Number.isFinite);
  return numbers.reduce((sum,n)=>sum+n,0);
}

function monthlyFrequency(value:unknown){
  if(typeof value!=='string')return 0;
  const raw=value.trim();
  const count=firstFiniteNumber(raw)??1;
  if(/يوم|يومي/.test(raw)) return count*30;
  if(/أسبوع|اسبوع|أسبوعي|اسبوعي/.test(raw)) return count*(52/12);
  if(/شهر|شهري/.test(raw)) return count;
  if(/سنة|سنوي/.test(raw)) return count/12;
  return firstFiniteNumber(raw)??0;
}

function firstFiniteNumber(value:string){
  const match=value.match(/\d+(?:\.\d+)?/);
  if(!match)return null;
  const n=Number(match[0]);
  return Number.isFinite(n)&&n>=0?n:null;
}

async function getExtendedFacts(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select fact_key,value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid and status='ACTIVE' and fact_key like 'extended:%'
  `;
  return new Map(rows.map(row=>[
    String(row.fact_key).replace(/^extended:/,''),
    row.value_json&&typeof row.value_json==='object'&&!Array.isArray(row.value_json)
      ?row.value_json as Record<string,unknown>
      :{},
  ]));
}

function buildBudgetLines(facts:Map<string,Record<string,unknown>>,snapshot:Awaited<ReturnType<typeof getFinancialCycleAllocationSnapshot>>){
  const lines:FoundingBudgetLine[]=[];
  const add=(key:string,title:string,monthlyAmount:number,source:string[],protectedLine=false)=>{
    if(monthlyAmount<=0)return;
    lines.push({key,title,monthlyAmount,source,protected:protectedLine});
  };

  const bills=facts.get('bills_subscriptions')??{};
  add('utilities','الفواتير والمرافق',monthlyFromTextRecord(bills,['electricity_bill','water_bill','mobile_bill','home_internet_bill'])+textMonthlyEstimate(bills.other_bills),['الفواتير والاشتراكات'],true);
  add('subscriptions','الاشتراكات',textMonthlyEstimate(bills.subscriptions),['الفواتير والاشتراكات']);

  const living=facts.get('daily_living')??{};
  add('food','الطعام والشراب',amount(living.daily_food_average)*30+amount(living.monthly_groceries),['المعيشة اليومية'],true);
  add('shopping','التسوق',amount(living.monthly_shopping),['المعيشة اليومية']);
  add('personal_care','العناية الشخصية',amount(living.personal_care),['المعيشة اليومية']);
  add('family_support','المساهمات الأسرية والمنزلية',amount(living.family_household_support)+textMonthlyEstimate(living.other_household_costs),['المعيشة اليومية'],true);

  const housing=facts.get('housing_details')??{};
  add('housing','السكن',amount(housing.monthly_housing_cost),['السكن والمرافق'],true);

  const vehicle=facts.get('vehicle_details')??{};
  const vehicleMonthly=amount(vehicle.monthly_fuel_cost)+(amount(vehicle.annual_maintenance_cost)/12)+(amount(vehicle.insurance_cost)/12);
  add('transport','المركبة والوقود والصيانة',vehicleMonthly,['المركبات والتنقل'],true);

  const behavior=facts.get('budget_behavior')??{};
  add('restaurants','المطاعم',amount(behavior.restaurants_average)*monthlyFrequency(behavior.restaurants_frequency),['سلوك بنود الميزانية']);
  add('cafes','المقاهي',amount(behavior.cafes_average)*monthlyFrequency(behavior.cafes_frequency),['سلوك بنود الميزانية']);
  if(amount(living.monthly_groceries)===0){
    add('groceries_behavior','البقالة',amount(behavior.groceries_average)*monthlyFrequency(behavior.groceries_frequency),['سلوك بنود الميزانية']);
  }

  const health=facts.get('health_education_family')??{};
  add('health_education_family','الصحة والتعليم والأسرة',textMonthlyEstimate(health.health_recurring)+textMonthlyEstimate(health.education_costs)+textMonthlyEstimate(health.family_nonmonthly),['الصحة والتعليم والأسرة'],true);

  const renewals=facts.get('renewals_insurance')??{};
  add('renewals','التجديدات والتأمينات',textMonthlyEstimate(renewals.renewals)/12+textMonthlyEstimate(renewals.insurance_policies)/12,['التجديدات والتأمينات']);

  if(snapshot.monthlyObligations>0){
    add('obligations','الالتزامات المثبتة',snapshot.monthlyObligations,['سجل الالتزامات'],true);
  }
  if(typeof snapshot.monthlyGoalNeed==='number'&&snapshot.monthlyGoalNeed>0){
    add('goals','الأهداف',snapshot.monthlyGoalNeed,['سجل الأهداف']);
  }
  return lines;
}

function buildAccountBuckets(lines:FoundingBudgetLine[]):FoundingAccountBucket[]{
  const spendingBuckets=lines
    .filter(line=>line.key!=='goals')
    .map(line=>({
      key:'spend:'+line.key,
      title:'بند '+line.title,
      purpose:'تخصيص مستقل لبند '+line.title+' ضمن دورة الراتب.',
      preferredGrouping:'SEPARATE_ACCOUNT' as const,
      amount:line.monthlyAmount,
      owner:line.key==='obligations'?'مسؤول الالتزامات':'مسؤول الميزانية والإنفاق',
    }));
  const goals=lines.find(line=>line.key==='goals')?.monthlyAmount??0;
  return [
    ...spendingBuckets,
    {
      key:'savings',
      title:'حساب الادخار',
      purpose:'الادخار المرتبط بالأهداف والخطط.',
      preferredGrouping:'SHARED_BANK_SEPARATE_ACCOUNT',
      amount:goals||null,
      owner:'مسؤول الأهداف',
    },
    {
      key:'reserve',
      title:'حساب الاحتياطي',
      purpose:'حماية السيولة والاحتياجات الطارئة.',
      preferredGrouping:'SHARED_BANK_SEPARATE_ACCOUNT',
      amount:null,
      owner:'مسؤول السيولة والحماية',
    },
    {
      key:'additional_reserve',
      title:'حساب الاحتياطي الإضافي',
      purpose:'فائض حماية إضافي بعد اكتمال الاحتياطي الأساسي.',
      preferredGrouping:'SHARED_BANK_SEPARATE_ACCOUNT',
      amount:null,
      owner:'مسؤول السيولة والحماية',
    },
  ];
}

export async function buildFoundingFinancialMeetingPack(userId:string):Promise<FoundingFinancialMeetingPack>{
  const journey=await getFinancialJourneyStatus(userId);
  const preparedAt=new Date().toISOString();
  const [snapshot,brief,agenda,facts]=await Promise.all([
    getFinancialCycleAllocationSnapshot(userId),
    getGovernorPreMeetingBrief(userId),
    getFinancialMeetingOpeningAgenda(userId),
    getExtendedFacts(userId),
  ]);
  const claims=buildFinancialResponsibilityClaims(snapshot);
  const lines=buildBudgetLines(facts,snapshot);
  const knownMonthlyOutflow=lines.reduce((sum,line)=>sum+line.monthlyAmount,0);
  const income=snapshot.availableIncome;
  const unallocated=income===null?null:income-knownMonthlyOutflow;
  return {
    ready:journey.founding_meeting_eligible,
    completionPercent:journey.completion_percent,
    preparedAt,
    participants:[
      {key:'central-governor',name:'محافظ بنك نماء المركزي',role:'رئيس الاجتماع'},
      {key:'budget-spending-owner',name:'مسؤول الميزانية والإنفاق',role:'بناء الميزانية ومتابعة الإنفاق'},
      {key:'obligations-owner',name:'مسؤول الالتزامات',role:'الالتزامات والاستحقاقات'},
      {key:'goals-owner',name:'مسؤول الأهداف',role:'الأهداف والادخار'},
      {key:'liquidity-protection-owner',name:'مسؤول السيولة والحماية',role:'الاحتياطي والحماية'},
      {key:'investment-owner',name:'مسؤول الاستثمار',role:'الأصول والاستثمار'},
      {key:'economic-advisor',name:'المستشار الاقتصادي',role:'تحليل الصورة المالية الكلية'},
      {key:'central-secretary',name:'أمين السر المركزي',role:'تنظيم الاجتماع والمحضر والمتابعة'},
    ],
    financialSnapshot:snapshot,
    claims,
    governorBrief:brief,
    agenda,
    budgetDraft:{
      income,
      lines,
      knownMonthlyOutflow,
      unallocated,
      complete:journey.founding_meeting_eligible&&income!==null,
    },
    accountBuckets:buildAccountBuckets(lines),
    safeguards:{userApprovalRequired:true,noBankTransfer:true,noExternalExecution:true},
  };
}