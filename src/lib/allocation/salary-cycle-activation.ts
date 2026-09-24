import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { buildFoundingFinancialMeetingPack } from '@/lib/allocation/founding-financial-meeting';

export type SalaryDistributionInstruction={
  key:string;
  title:string;
  amount:number;
  sourceAccountId:string|null;
  destinationAccountId:string|null;
  destinationAccountName:string|null;
  status:'READY'|'NEEDS_ACCOUNT_MAPPING';
  externalExecution:false;
};

export type SalaryCycleActivationResult={
  status:'ACTIVATED'|'ALREADY_ACTIVE'|'NOT_READY'|'NEEDS_APPROVED_PLAN';
  cycleId:string|null;
  planId:string|null;
  salaryAmount:number|null;
  receivedOn:string|null;
  expectedNextSalaryDate:string|null;
  expectedNextSalaryDateProvisional:boolean;
  instructions:SalaryDistributionInstruction[];
  unmatchedBuckets:string[];
  externalExecution:false;
};

function isoDate(date:Date){return date.toISOString().slice(0,10);}
function addOneMonth(date:Date){
  const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1));
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(date.getUTCDate(),last));
  return d;
}
function money(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)&&n>=0?n:null;
}

export function isSalaryReceivedCommand(text:string){
  const raw=text.trim();
  return /^(تم نزول الراتب|نزل الراتب|الراتب نزل|وصل الراتب|تم إيداع الراتب|تم ايداع الراتب)$/i.test(raw);
}

export async function activateSalaryCycle(userId:string,receivedAt=new Date()):Promise<SalaryCycleActivationResult>{
  const pack=await buildFoundingFinancialMeetingPack(userId);
  if(!pack.ready){
    return {status:'NOT_READY',cycleId:null,planId:null,salaryAmount:pack.budgetDraft.income,receivedOn:null,expectedNextSalaryDate:null,expectedNextSalaryDateProvisional:false,instructions:[],unmatchedBuckets:[],externalExecution:false};
  }

  const sql=getRawSql();
  const activeRows=await sql`
    select id,start_date::text,expected_next_income_date::text
    from public.financial_cycles
    where user_id=${userId}::uuid and status='ACTIVE'
    order by activated_at desc nulls last,created_at desc limit 1
  `;
  if(activeRows[0]?.id){
    const cycleId=String(activeRows[0].id);
    const planRows=await sql`select id from public.financial_plans where user_id=${userId}::uuid and cycle_id=${cycleId}::uuid order by created_at desc limit 1`;
    return {status:'ALREADY_ACTIVE',cycleId,planId:planRows[0]?.id?String(planRows[0].id):null,salaryAmount:pack.budgetDraft.income,receivedOn:String(activeRows[0].start_date),expectedNextSalaryDate:String(activeRows[0].expected_next_income_date),expectedNextSalaryDateProvisional:false,instructions:[],unmatchedBuckets:[],externalExecution:false};
  }

  const approvedPlanRows=await sql`
    select fp.id as plan_id,fp.cycle_id,pv.id as version_id
    from public.financial_plans fp
    join public.plan_versions pv on pv.id=fp.current_version_id and pv.user_id=fp.user_id
    where fp.user_id=${userId}::uuid
      and fp.status in ('ACTIVE_PLAN','REVISED')
      and pv.is_current=true and pv.approved_at is not null
    order by fp.approved_at desc nulls last,fp.updated_at desc
    limit 1
  `;
  const approved=approvedPlanRows[0];
  if(!approved?.plan_id){
    return {status:'NEEDS_APPROVED_PLAN',cycleId:null,planId:null,salaryAmount:pack.budgetDraft.income,receivedOn:null,expectedNextSalaryDate:null,expectedNextSalaryDateProvisional:false,instructions:[],unmatchedBuckets:pack.accountBuckets.map(item=>item.title),externalExecution:false};
  }

  let cycleId=approved.cycle_id?String(approved.cycle_id):null;
  const startDate=isoDate(receivedAt);
  const provisionalNext=isoDate(addOneMonth(receivedAt));
  let expectedNext=provisionalNext;
  let provisional=true;

  if(cycleId){
    const cycleRows=await sql`select id,status,expected_next_income_date::text from public.financial_cycles where id=${cycleId}::uuid and user_id=${userId}::uuid limit 1`;
    const cycle=cycleRows[0];
    if(cycle?.expected_next_income_date){
      const candidate=String(cycle.expected_next_income_date);
      if(candidate>=startDate){expectedNext=candidate;provisional=false;}
    }
    if(cycle?.id){
      await sql`update public.financial_cycles set status='ACTIVE',start_date=${startDate}::date,activated_at=now(),updated_at=now() where id=${cycleId}::uuid and user_id=${userId}::uuid and status='DRAFT'`;
    }
  }

  if(!cycleId){
    cycleId=randomUUID();
    await sql`insert into public.financial_cycles(id,user_id,name,start_date,expected_next_income_date,status,activated_at) values(${cycleId}::uuid,${userId}::uuid,${'دورة راتب '+startDate},${startDate}::date,${expectedNext}::date,'ACTIVE',now())`;
    await sql`update public.financial_plans set cycle_id=${cycleId}::uuid,status='ACTIVE_PLAN',updated_at=now() where id=${String(approved.plan_id)}::uuid and user_id=${userId}::uuid`;
  }

  const salaryAmount=pack.budgetDraft.income;
  if(typeof salaryAmount==='number'&&salaryAmount>0){
    const existingIncome=await sql`select id from public.expected_incomes where user_id=${userId}::uuid and cycle_id=${cycleId}::uuid and is_primary=true limit 1`;
    if(existingIncome[0]?.id){
      await sql`update public.expected_incomes set expected_amount=${salaryAmount},expected_date=${startDate}::date,source_name='الراتب',income_kind='SALARY',updated_at=now() where id=${String(existingIncome[0].id)}::uuid and user_id=${userId}::uuid`;
    }else{
      await sql`insert into public.expected_incomes(id,user_id,cycle_id,source_name,expected_amount,expected_date,income_kind,is_primary) values(${randomUUID()}::uuid,${userId}::uuid,${cycleId}::uuid,'الراتب',${salaryAmount},${startDate}::date,'SALARY',true)`;
    }
  }

  const accountRows=await sql`
    select id,name,account_type,bank_name
    from public.accounts
    where user_id=${userId}::uuid and is_active=true
    order by created_at asc
  `;
  const accounts=accountRows.map(row=>({id:String(row.id),name:String(row.name),type:String(row.account_type),bankName:row.bank_name?String(row.bank_name):null}));
  const source=accounts.find(account=>account.type==='BANK')??accounts[0]??null;

  const findDestination=(bucketKey:string,title:string)=>{
    const normalized=title.replace(/^حساب\s+/,'');
    if(bucketKey==='savings') return accounts.find(a=>a.type==='SAVINGS'&&/ادخار|توفير/.test(a.name))??accounts.find(a=>a.type==='SAVINGS')??null;
    if(bucketKey==='reserve') return accounts.find(a=>/احتياط(?!.*إضاف)/.test(a.name))??null;
    if(bucketKey==='additional_reserve') return accounts.find(a=>/احتياط.*إضاف/.test(a.name))??null;
    return accounts.find(a=>a.name.includes(normalized)||normalized.includes(a.name))??source;
  };

  const instructions:SalaryDistributionInstruction[]=pack.accountBuckets.flatMap(bucket=>{
    const amt=money(bucket.amount);
    if(amt===null||amt<=0)return [];
    const destination=findDestination(bucket.key,bucket.title);
    return [{
      key:bucket.key,title:bucket.title,amount:amt,sourceAccountId:source?.id??null,
      destinationAccountId:destination?.id??null,destinationAccountName:destination?.name??null,
      status:destination?'READY':'NEEDS_ACCOUNT_MAPPING',externalExecution:false as const,
    }];
  });
  const unmatchedBuckets=instructions.filter(item=>item.status==='NEEDS_ACCOUNT_MAPPING').map(item=>item.title);

  return {status:'ACTIVATED',cycleId,planId:String(approved.plan_id),salaryAmount:salaryAmount??null,receivedOn:startDate,expectedNextSalaryDate:expectedNext,expectedNextSalaryDateProvisional:provisional,instructions,unmatchedBuckets,externalExecution:false};
}

export async function createSalaryCycleActivationReply(userId:string){
  const result=await activateSalaryCycle(userId);
  const sql=getRawSql();
  const roomRows=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='central'
    limit 1
  `;
  const threadId=roomRows[0]?.id?String(roomRows[0].id):null;
  if(!threadId) return {result,reply:null};

  let body='';
  let kind='followup';
  if(result.status==='NOT_READY'){
    body='وصلني تأكيد نزول الراتب، لكن الملف المالي لم يكتمل 100٪ بعد. لن أبدأ توزيعًا مبنيًا على بيانات ناقصة. سأكمل معك البيانات المطلوبة أولًا.';
    kind='request';
  }else if(result.status==='NEEDS_APPROVED_PLAN'){
    body='تم تسجيل أن الراتب نزل، لكن لا توجد بعد ميزانية معتمدة من الاجتماع التأسيسي. لن أوزع المبلغ قبل اعتماد الخطة. الخطوة التالية هي اعتماد مشروع الميزانية والتوزيع.';
    kind='request';
  }else if(result.status==='ALREADY_ACTIVE'){
    body='الدورة المالية الحالية مفعلة بالفعل. سأستمر في متابعة الصرف والمطابقة والانحرافات على الخطة النشطة.';
  }else{
    const ready=result.instructions.filter(item=>item.status==='READY');
    const total=ready.reduce((sum,item)=>sum+item.amount,0);
    const unmatched=result.unmatchedBuckets.length;
    body=`تم تفعيل دورة الراتب من تاريخ ${result.receivedOn}. جهزت ${ready.length} تعليمات توزيع داخلية بإجمالي ${new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(total)} ر.س. ${unmatched? `بقي ${unmatched} بند/بنود تحتاج ربط حساب وجهة قبل التنفيذ.`:'جميع البنود ذات المبالغ أصبحت مرتبطة بوجهات معروفة.'} لا أنفذ أي تحويل بنكي خارجي تلقائيًا.`;
  }

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','budget-spending-owner','مسؤول الميزانية والإنفاق',
      ${kind},${body},
      ${JSON.stringify({
        salary_cycle_activation:true,
        activation_status:result.status,
        cycle_id:result.cycleId,
        plan_id:result.planId,
        salary_amount:result.salaryAmount,
        received_on:result.receivedOn,
        expected_next_salary_date:result.expectedNextSalaryDate,
        expected_next_salary_date_provisional:result.expectedNextSalaryDateProvisional,
        distribution_instructions:result.instructions,
        unmatched_buckets:result.unmatchedBuckets,
        external_execution:false,
        execution_boundary:'تفعيل داخلي للدورة وتعليمات توزيع فقط؛ لا تحويل بنكي خارجي تلقائي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return {result,reply:rows[0]??null};
}
