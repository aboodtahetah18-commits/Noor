import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { formatSar } from '@/lib/format-money';
import { NAMAA_PERSONA_ASSETS } from '@/components/conversations/persona-assets';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { createGoalAction } from '../goals/actions';

type PendingItem={rowId:string;description:string;bankName?:string|null;accountName:string;transactionDate?:string|null;direction:string;amount:string;detectedKind:string;duplicateCandidate?:boolean;importId:string;};
type RecentApproved={id:string;transactionDate:string;description:string;amount:string;transactionType:string;accountName:string;categoryName:string|null;};
type BankKey='central'|'hilal'|'solvency'|'assets';
type BankTab='overview'|'operations'|'goals'|'investments'|'policies'|'team';

const KIND:Record<string,string>={EXPENSE:'مصروف',INCOME:'دخل',TRANSFER:'تحويل',REFUND:'استرداد',FEE:'رسوم',UNKNOWN:'غير معروف'};
const tabs:{key:BankTab;label:string}[]=[
  {key:'overview',label:'نظرة عامة'},
  {key:'operations',label:'العمليات'},
  {key:'goals',label:'الأهداف المالية'},
  {key:'investments',label:'الاستثمار والادخار'},
  {key:'policies',label:'السياسات والقرارات'},
  {key:'team',label:'الفريق الخوارزمي'},
];

const banks={
  central:{name:'بنك نماء المركزي',subtitle:'الحوكمة والاستقرار والرقابة',building:'/brand/ndos/banks/namaa-central-bank.jpg',
    team:[{key:'central-governor',name:'محافظ بنك نماء المركزي'},{key:'central-bank-manager',name:'مدير بنك نماء المركزي'},{key:'economic-advisor',name:'المستشار الاقتصادي'},{key:'central-secretary',name:'أمين السر المركزي'}],
    goals:['الاستقرار المالي','سلامة السيولة','اتساق القرارات بين البنوك'],
    focus:'يراقب السيولة والحوكمة والتعارضات بين قرارات البنوك ويقيس القدرة على امتصاص الصدمات.'},
  hilal:{name:'بنك الهلال',subtitle:'التمويل الداخلي والالتزامات',building:'/brand/ndos/banks/hilal-bank.jpg',
    team:[{key:'hilal-manager',name:'مدير بنك الهلال'},{key:'obligations-owner',name:'مسؤول الالتزامات'},{key:'budget-spending-owner',name:'مسؤول الميزانية والإنفاق'}],
    goals:['ضبط التمويل الداخلي','خفض ضغط الالتزامات','رفع وضوح التدفقات'],
    focus:'يراقب الالتزامات والتمويل الداخلي وحركة السداد والضغط المتوقع على التدفق النقدي.'},
  solvency:{name:'بنك ملاءة',subtitle:'الحماية والاحتياطي والسيولة',building:'/brand/ndos/banks/malaa-bank.jpg',
    team:[{key:'solvency-manager',name:'مدير بنك ملاءة'},{key:'liquidity-protection-owner',name:'مسؤول السيولة والحماية'},{key:'obligations-owner',name:'مسؤول الالتزامات'}],
    goals:['رفع هامش الأمان','حماية الاحتياطي','تخفيف مخاطر السيولة'],
    focus:'يراقب صندوق الطوارئ وهامش الأمان وسياسة الاحتياطي وقدرة السيولة على مواجهة أي ضغط.'},
  assets:{name:'بنك الأصول الاستثمارية',subtitle:'الأصول والاستثمار والأهداف',building:'/brand/ndos/banks/investment-assets-bank.jpg',
    team:[{key:'assets-manager',name:'مدير بنك الأصول'},{key:'investment-owner',name:'مسؤول الاستثمار'},{key:'goals-owner',name:'مسؤول الأهداف'}],
    goals:['تحسين جودة المحافظ','ضبط المخاطر الاستثمارية','ربط الاستثمار بالأهداف'],
    focus:'يراقب الادخار والأهداف والأصول الاستثمارية وربط أي إضافة جديدة بخطة مالية قابلة للقياس.'},
} as const;

type DashboardData={
  activeAccountCount:number;totalLiquidity:number;activeGoalCount:number;goalsRemaining:number;goalsGap:number;goalsApprovedThisCycle:number;goalsRequiredThisCycle:number;
  emergencyBalance:number;emergencyProgress:number;emergencyCoverageMonths:number|null;savingsActual:number;savingsPlanned:number;pendingImportsCount:number;
  duplicateCandidatesCount:number;unclassifiedCount:number;activeFundingCount:number;recentApproved:RecentApproved[];decisionCount:number;
  latestDecisions:{id:string;eventType:string;sourceType:'USER'|'SYSTEM';affectedCount:number;affectedAmount:string|null;reason:string|null;createdAt:string;}[];
  bufferPolicy:{mode:string;fixedAmount:string;percentBps:number;updatedAt:string}|null;
};

function clampPercent(value:number){return Math.max(0,Math.min(100,Math.round(value)));}
function hrefFor(bank:BankKey,tab:BankTab){return '/bank-operations?bank='+bank+'&tab='+tab;}
function policyLabel(mode:string){if(mode==='FIXED')return 'مبلغ ثابت';if(mode==='PERCENT_INCOME')return 'نسبة من الدخل';return 'الأعلى بين مبلغ ثابت ونسبة من الدخل';}
function sarNumber(value:string|number){return formatSar(String(value)).replace(/\s*\u20C1$/u,'');}
function Sar({value}:{value:string|number}){return <span className="namaa-sar-value"><Image src="/brand/saudi-riyal-symbol.png" alt="ريال سعودي" width={16} height={16} unoptimized/><span>{sarNumber(value)}</span></span>;}
function InfoNote({children}:{children:React.ReactNode}){return <details className="namaa-inline-info"><summary aria-label="معلومات"><LucideIcon name="info" size={16}/></summary><div>{children}</div></details>;}


export function BanksWide({selected,selectedTab,pendingReviewCount,pendingItems,dashboardData}:{selected:BankKey;selectedTab:BankTab;pendingReviewCount:number;pendingItems:PendingItem[];dashboardData:DashboardData}){
  const bank=banks[selected];
  const pendingValue=pendingItems.reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);
  const debitValue=pendingItems.filter(item=>item.direction==='DEBIT').reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);
  const creditValue=pendingItems.filter(item=>item.direction!=='DEBIT').reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);
  const debitShare=pendingValue>0?clampPercent((debitValue/pendingValue)*100):null;
  const savingsProgress=dashboardData.savingsPlanned>0?clampPercent((dashboardData.savingsActual/dashboardData.savingsPlanned)*100):null;
  const goalCycleProgress=dashboardData.goalsRequiredThisCycle>0?clampPercent((dashboardData.goalsApprovedThisCycle/dashboardData.goalsRequiredThisCycle)*100):null;
  const emergencyProgress=Number.isFinite(dashboardData.emergencyProgress)?clampPercent(dashboardData.emergencyProgress):null;
  const maxPending=Math.max(1,...pendingItems.map(item=>Math.abs(Number(item.amount)||0)));
  const recentApprovedValue=dashboardData.recentApproved.reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);

  return <section className="namaa-banks-wide" dir="rtl">
    <header className="namaa-banks-hero namaa-wide-card">
      <div className="namaa-banks-hero-copy"><p>غرفة القيادة</p><h1>{bank.name}</h1><span>{bank.subtitle}</span></div>
      <div className="namaa-banks-selector">{Object.entries(banks).map(([key,item])=><Link key={key} href={hrefFor(key as BankKey,'overview')} className={selected===key?'is-active':''}>{item.name}</Link>)}</div>
    </header>

    <nav className="namaa-bank-tabs" aria-label="أقسام البنك">
      {tabs.map(tab=><Link key={tab.key} href={hrefFor(selected,tab.key)} className={selectedTab===tab.key?'is-active':''}>{tab.label}</Link>)}
    </nav>

    <section className="namaa-bank-tab-panel">
      {selectedTab==='overview'&&<>
        <div className="namaa-bank-panel-head"><div><span>الوضع الحالي</span><div className="namaa-bank-title-row"><h2>{bank.name}</h2><InfoNote>{bank.focus}</InfoNote></div></div><LucideIcon name="chart" size={20}/></div>
        <div className="namaa-banks-kpis namaa-banks-kpis-dashboard">
          <article className="is-money"><div><span>إجمالي السيولة</span><small>{dashboardData.activeAccountCount} حساب نشط</small></div><strong><Sar value={dashboardData.totalLiquidity}/></strong></article>
          <article className="is-count"><div><span>عمليات تحتاج مراجعة</span><small>{pendingReviewCount===1?'عملية واحدة':'عدد العمليات'}</small></div><strong>{pendingReviewCount}</strong></article>
          <article className="is-money"><div><span>صندوق الطوارئ</span><small>{emergencyProgress==null?'التغطية غير مكتملة':emergencyProgress+'٪ من الهدف'}</small></div><strong><Sar value={dashboardData.emergencyBalance}/></strong></article>
          <article className="is-count"><div><span>الأهداف النشطة</span><small>هدف مالي جارٍ</small></div><strong>{dashboardData.activeGoalCount}</strong></article>
          <article className="is-money"><div><span>الادخار المحول</span><small>{savingsProgress==null?'لا يوجد مخصص حالي':savingsProgress+'٪ من المخصص'}</small></div><strong><Sar value={dashboardData.savingsActual}/></strong></article>
          <article className="is-count"><div><span>قرارات مسجلة</span><small>آخر نشاطات الحوكمة البنكية</small></div><strong>{dashboardData.decisionCount}</strong></article>
        </div>
        <div className="namaa-banks-health-grid">
          <article className="is-count"><div><span>تكرارات محتملة</span><small>قيد المراجعة</small></div><strong>{dashboardData.duplicateCandidatesCount}</strong></article>
          <article className="is-count"><div><span>عمليات غير مصنفة</span><small>تحتاج بندًا</small></div><strong>{dashboardData.unclassifiedCount}</strong></article>
          <article className="is-money"><div><span>آخر عمليات معتمدة</span><small>{dashboardData.recentApproved.length} عملية</small></div><strong><Sar value={recentApprovedValue}/></strong></article>
          <article className="is-count"><div><span>تمويل داخلي نشط</span><small>{dashboardData.pendingImportsCount} كشف/دفعة للمراجعة</small></div><strong>{dashboardData.activeFundingCount}</strong></article>
        </div>
      </>}

      {selectedTab==='operations'&&<>
        <div className="namaa-bank-panel-head"><div><span>التشغيل اليومي</span><h2>العمليات</h2></div><div className="namaa-bank-head-actions"><InfoNote>كل ما يحتاج قرارًا أو مراجعة في شاشة واحدة.</InfoNote><Link href="/bank-statements">فتح المطابقة</Link></div></div>
        <div className="namaa-bank-operations-summary">
          <article className="is-count"><div><span>تحتاج مراجعة</span><small>عدد العمليات</small></div><strong>{pendingReviewCount}</strong></article>
          <article className="is-money"><div><span>قيمة معلقة</span><small>إجمالي القيمة</small></div><strong><Sar value={pendingValue}/></strong></article>
          <article className="is-count"><div><span>آخر عمليات معتمدة</span><small>عدد العمليات</small></div><strong>{dashboardData.recentApproved.length}</strong></article>
        </div>
        <div className="namaa-bank-operations-visuals">
          <article className="namaa-bank-donut-card namaa-bank-operation-card"><div><span>اتجاه العمليات المعلقة</span><strong>{debitShare==null?'لا توجد عمليات معلقة':debitShare+'٪ خصم'}</strong><small>{debitShare==null?'لا توجد بيانات حالية':<>خصم <Sar value={debitValue}/> · إضافة <Sar value={creditValue}/></>}</small></div>{debitShare==null?<div className="namaa-bank-no-chart">لا بيانات</div>:<div className="namaa-bank-donut" style={{'--namaa-donut-share':debitShare+'%'} as React.CSSProperties}><b>{debitShare}٪</b></div>}</article>
          <article className="namaa-bank-bars-card namaa-bank-operation-card"><div><span>أعلى العمليات المعلقة</span><strong>{Math.min(5,pendingItems.length)} عملية</strong></div><div className="namaa-bank-bars">{pendingItems.slice(0,5).map(item=><div key={item.rowId}><span>{item.description}</span><i style={{width:Math.max(6,(Math.abs(Number(item.amount)||0)/maxPending)*100)+'%'}}/><b><Sar value={item.amount}/></b></div>)}{pendingItems.length===0?<p>لا توجد عمليات معلقة.</p>:null}</div></article>
        </div>
        {pendingItems.length===0?<div className="namaa-banks-empty"><strong>لا توجد عمليات معلقة</strong><p>أي عملية تحتاج قرارًا ستظهر هنا.</p></div>:<div className="namaa-banks-pending-list">{pendingItems.slice(0,8).map(item=><article key={item.rowId}><div><strong>{item.description}</strong><span>{(item.bankName?item.bankName+' · ':'')+item.accountName+' · '+(item.transactionDate??'بدون تاريخ')}</span></div><b>{item.direction==='DEBIT'?'−':'+'}<Sar value={item.amount}/></b><div><span>{KIND[item.detectedKind]??item.detectedKind}</span>{item.duplicateCandidate?<em>مكرر محتمل</em>:null}<Link href={'/bank-statements/'+item.importId}>مراجعة</Link></div></article>)}</div>}
      </>}

      {selectedTab==='goals'&&<>
        <div className="namaa-bank-panel-head"><div><span>المسار المالي</span><h2>الأهداف المالية</h2></div><div className="namaa-bank-head-actions">{selected==='assets'?<ActionDialog presentation="page" title="إضافة هدف مالي" triggerClassName="namaa-bank-mini-action" trigger={<span><LucideIcon name="plus" size={16}/>إضافة هدف</span>}><form action={createGoalAction} className="form-grid"><label>اسم الهدف<input name="name" required/></label><label>قيمة الهدف<input name="targetAmount" inputMode="decimal" required/></label><label>الرصيد الحالي<input name="openingBalance" inputMode="decimal" defaultValue="0.00"/></label><label>تاريخ البداية<input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>التاريخ المستهدف<input name="targetDate" type="date"/></label><label>الأولوية<input name="priority" type="number" min="1"/></label><button className="primary-button" type="submit">إنشاء الهدف</button></form></ActionDialog>:null}<Link href="/goals">إدارة الأهداف</Link></div></div>
        <div className="namaa-bank-goal-metrics"><article><span>أهداف نشطة</span><strong>{dashboardData.activeGoalCount}</strong></article><article><span>المتبقي</span><strong><Sar value={dashboardData.goalsRemaining}/></strong></article><article><span>فجوة الدورة</span><strong><Sar value={dashboardData.goalsGap}/></strong></article></div>
        <article className="namaa-bank-progress-card namaa-bank-goal-progress"><div><span>تمويل أهداف الدورة</span><strong>{goalCycleProgress==null?'غير مكتمل':goalCycleProgress+'٪'}</strong><small>{goalCycleProgress==null?'لا يوجد مبلغ مطلوب للدورة الحالية':<>معتمد <Sar value={dashboardData.goalsApprovedThisCycle}/> من <Sar value={dashboardData.goalsRequiredThisCycle}/></>}</small></div>{goalCycleProgress==null?<div className="namaa-bank-no-chart">لا مسار حالي</div>:<div className="namaa-bank-progress-track"><i style={{width:goalCycleProgress+'%'}}/></div>}</article>
        <div className="namaa-banks-goals-list">{bank.goals.map(goal=><article key={goal}><LucideIcon name="circleCheck" size={20}/><div><strong>{goal}</strong><small>يظهر أثره في مؤشرات البنك وقرارات الدورة.</small></div></article>)}</div>
      </>}

      {selectedTab==='investments'&&<>
        <div className="namaa-bank-panel-head"><div><span>النمو والحماية</span><h2>الاستثمار والادخار</h2></div><InfoNote>{selected==='assets'?'إدارة الأصول والادخار وربط أي إضافة جديدة بالأهداف.':'عرض أثر الادخار والاستثمار على وضع البنك.'}</InfoNote></div>
        <div className="namaa-bank-investment-grid">
          <article><span>الادخار المحول</span><strong><Sar value={dashboardData.savingsActual}/></strong><small>{savingsProgress==null?'لا يوجد مخصص حالي':savingsProgress+'٪ من المخصص'}</small><Link href="/savings">فتح الادخار</Link></article>
          <article><span>صندوق الطوارئ</span><strong><Sar value={dashboardData.emergencyBalance}/></strong><small>{dashboardData.emergencyCoverageMonths==null?'التغطية غير مكتملة':dashboardData.emergencyCoverageMonths+' شهر تغطية'}</small><Link href="/emergency">فتح الطوارئ</Link></article>
          <article><span>الحسابات المرتبطة</span><strong>{dashboardData.activeAccountCount}</strong><small>حساب نشط</small><Link href="/accounts">إضافة أو إدارة حساب</Link></article>
          <article><span>المحفظة الاستثمارية</span><strong>فتح الإدارة</strong><small>إدارة الأصول والفرص المرتبطة</small><Link href="/investments">فتح الاستثمارات</Link></article>
        </div>
      </>}

      {selectedTab==='policies'&&<>
        <div className="namaa-bank-panel-head"><div><span>الحوكمة والقرارات</span><h2>السياسات والإجراءات</h2></div><div className="namaa-bank-head-actions"><InfoNote>عرض ما هو مسجل فعليًا دون إنشاء حالات افتراضية.</InfoNote><Link href="/governance">فتح الحوكمة</Link></div></div>
        {selected==='solvency'&&<div className="namaa-bank-buffer-card"><span>سياسة الاحتياطي المالي</span><strong>{dashboardData.bufferPolicy?policyLabel(dashboardData.bufferPolicy.mode):'لا توجد سياسة احتياطي نشطة'}</strong>{dashboardData.bufferPolicy?<small>{dashboardData.bufferPolicy.mode==='FIXED'||dashboardData.bufferPolicy.mode==='MAX_FIXED_PERCENT'?formatSar(dashboardData.bufferPolicy.fixedAmount):''}{dashboardData.bufferPolicy.percentBps>0?' · '+(dashboardData.bufferPolicy.percentBps/100).toFixed(2)+'٪ من الدخل':''}</small>:null}</div>}
        <div className="namaa-bank-decisions-list">{dashboardData.latestDecisions.length===0?<div className="namaa-banks-empty"><strong>لا توجد قرارات بنكية مسجلة</strong><p>عند تسجيل قرار أو تعديل سيظهر هنا.</p></div>:dashboardData.latestDecisions.map(item=><article key={item.id}><div><strong>{item.reason??'قرار بنكي مسجل'}</strong><span>{item.sourceType==='SYSTEM'?'قرار نظام':'قرار مستخدم'} · {new Date(item.createdAt).toLocaleDateString('ar-SA')}</span></div><b>{item.affectedCount} متأثر</b></article>)}</div>
        <div className="namaa-bank-policy-links"><Link href="/governance/procedures">الإجراءات</Link><Link href="/decision-log">سجل القرارات</Link><Link href="/governance/authorization-matrix">الصلاحيات</Link></div>
      </>}

      {selectedTab==='team'&&<>
        <div className="namaa-bank-panel-head"><div><span>الفريق الخوارزمي</span><h2>{bank.name}</h2></div><div className="namaa-bank-head-tools"><InfoNote>المسؤولون الذين يتابعون هذا البنك ويجتمعون في غرفة واحدة عند فتح المحادثة.</InfoNote><LucideIcon name="circleUserRound" size={20}/></div></div>
        <div className="namaa-banks-team-list namaa-banks-team-grid">{bank.team.map(member=><article key={member.key}><span className="namaa-banks-persona" aria-hidden="true"><Image src={NAMAA_PERSONA_ASSETS[member.key]??'/brand/personas/central-governor.webp'} alt="" fill unoptimized sizes="72px"/></span><div><strong>{member.name}</strong></div></article>)}</div>
        <Link href={'/conversations?room='+selected} className="namaa-banks-chat-link"><LucideIcon name="messageSquareText" size={20}/><span>فتح محادثة جماعية مع فريق {bank.name}</span></Link>
      </>}
    </section>
  </section>;
}
