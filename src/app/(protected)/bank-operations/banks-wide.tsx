import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { formatSar } from '@/lib/format-money';
import { NAMAA_PERSONA_ASSETS } from '@/components/conversations/persona-assets';

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
      <span className="namaa-banks-building" aria-hidden="true"><Image src={bank.building} alt="" fill priority quality={92} unoptimized sizes="(min-width: 1024px) 72vw, 100vw"/><span className="namaa-banks-building-shade"/></span>
      <div className="namaa-banks-selector">{Object.entries(banks).map(([key,item])=><Link key={key} href={hrefFor(key as BankKey,'overview')} className={selected===key?'is-active':''}>{item.name}</Link>)}</div>
    </header>

    <nav className="namaa-bank-tabs" aria-label="أقسام البنك">
      {tabs.map(tab=><Link key={tab.key} href={hrefFor(selected,tab.key)} className={selectedTab===tab.key?'is-active':''}>{tab.label}</Link>)}
    </nav>

    <section className="namaa-bank-tab-panel">
      {selectedTab==='overview'&&<>
        <div className="namaa-bank-panel-head"><div><span>الوضع الحالي</span><h2>{bank.name}</h2><p>{bank.focus}</p></div><LucideIcon name="chart" size={20}/></div>
        <div className="namaa-banks-kpis namaa-banks-kpis-dashboard">
          <article><div><span>إجمالي السيولة</span><small>{dashboardData.activeAccountCount} حساب نشط</small></div><strong>{formatSar(String(dashboardData.totalLiquidity))}</strong></article>
          <article><div><span>عمليات تحتاج مراجعة</span><small>{formatSar(String(pendingValue))} قيمة معلقة</small></div><strong>{pendingReviewCount}</strong></article>
          <article><div><span>صندوق الطوارئ</span><small>{emergencyProgress==null?'التغطية غير مكتملة':emergencyProgress+'٪ من الهدف'}</small></div><strong>{formatSar(String(dashboardData.emergencyBalance))}</strong></article>
          <article><div><span>الأهداف النشطة</span><small>{formatSar(String(dashboardData.goalsRemaining))} متبقي</small></div><strong>{dashboardData.activeGoalCount}</strong></article>
          <article><div><span>الادخار المحول</span><small>{savingsProgress==null?'لا يوجد مخصص حالي':savingsProgress+'٪ من المخصص'}</small></div><strong>{formatSar(String(dashboardData.savingsActual))}</strong></article>
          <article><div><span>قرارات مسجلة</span><small>آخر نشاطات الحوكمة البنكية</small></div><strong>{dashboardData.decisionCount}</strong></article>
        </div>
        <div className="namaa-banks-visual-dashboard">
          <article className="namaa-bank-donut-card"><div><span>اتجاه العمليات المعلقة</span><strong>{debitShare==null?'لا توجد عمليات معلقة':debitShare+'٪ خصم'}</strong><small>{debitShare==null?'لا توجد بيانات حالية':`خصم ${formatSar(String(debitValue))} · إضافة ${formatSar(String(creditValue))}`}</small></div>{debitShare==null?<div className="namaa-bank-no-chart">لا بيانات</div>:<div className="namaa-bank-donut" style={{'--namaa-donut-share':debitShare+'%'} as React.CSSProperties}><b>{debitShare}٪</b></div>}</article>
          <article className="namaa-bank-progress-card"><div><span>تمويل أهداف الدورة</span><strong>{goalCycleProgress==null?'غير مكتمل':goalCycleProgress+'٪'}</strong><small>{goalCycleProgress==null?'لا يوجد مبلغ مطلوب للدورة الحالية':`معتمد ${formatSar(String(dashboardData.goalsApprovedThisCycle))} من ${formatSar(String(dashboardData.goalsRequiredThisCycle))}`}</small></div>{goalCycleProgress==null?<div className="namaa-bank-no-chart">لا مسار حالي</div>:<div className="namaa-bank-progress-track"><i style={{width:goalCycleProgress+'%'}}/></div>}<div className="namaa-bank-progress-split"><span>فجوة الدورة</span><b>{formatSar(String(dashboardData.goalsGap))}</b></div></article>
          <article className="namaa-bank-bars-card"><div><span>أعلى العمليات المعلقة</span><strong>{Math.min(5,pendingItems.length)} عملية</strong><small>مقارنة بالقيمة الأعلى حاليًا</small></div><div className="namaa-bank-bars">{pendingItems.slice(0,5).map(item=><div key={item.rowId}><span>{item.description}</span><i style={{width:Math.max(6,(Math.abs(Number(item.amount)||0)/maxPending)*100)+'%'}}/><b>{formatSar(item.amount)}</b></div>)}{pendingItems.length===0?<p>لا توجد عمليات معلقة.</p>:null}</div></article>
        </div>
        <div className="namaa-banks-health-grid">
          <article><span>تكرارات محتملة</span><strong>{dashboardData.duplicateCandidatesCount}</strong><small>قيد المراجعة</small></article>
          <article><span>عمليات غير مصنفة</span><strong>{dashboardData.unclassifiedCount}</strong><small>تحتاج بندًا</small></article>
          <article><span>آخر عمليات معتمدة</span><strong>{dashboardData.recentApproved.length}</strong><small>{formatSar(String(recentApprovedValue))}</small></article>
          <article><span>تمويل داخلي نشط</span><strong>{dashboardData.activeFundingCount}</strong><small>{dashboardData.pendingImportsCount} كشف/دفعة للمراجعة</small></article>
        </div>
      </>}

      {selectedTab==='operations'&&<>
        <div className="namaa-bank-panel-head"><div><span>التشغيل اليومي</span><h2>العمليات</h2><p>كل ما يحتاج قرارًا أو مراجعة في شاشة واحدة.</p></div><Link href="/bank-statements">فتح المطابقة</Link></div>
        <div className="namaa-bank-operations-summary"><article><span>تحتاج مراجعة</span><strong>{pendingReviewCount}</strong></article><article><span>قيمة معلقة</span><strong>{formatSar(String(pendingValue))}</strong></article><article><span>آخر عمليات معتمدة</span><strong>{dashboardData.recentApproved.length}</strong></article></div>
        {pendingItems.length===0?<div className="namaa-banks-empty"><strong>لا توجد عمليات معلقة</strong><p>أي عملية تحتاج قرارًا ستظهر هنا.</p></div>:<div className="namaa-banks-pending-list">{pendingItems.slice(0,8).map(item=><article key={item.rowId}><div><strong>{item.description}</strong><span>{(item.bankName?item.bankName+' · ':'')+item.accountName+' · '+(item.transactionDate??'بدون تاريخ')}</span></div><b>{item.direction==='DEBIT'?'−':'+'}{formatSar(item.amount)}</b><div><span>{KIND[item.detectedKind]??item.detectedKind}</span>{item.duplicateCandidate?<em>مكرر محتمل</em>:null}<Link href={'/bank-statements/'+item.importId}>مراجعة</Link></div></article>)}</div>}
      </>}

      {selectedTab==='goals'&&<>
        <div className="namaa-bank-panel-head"><div><span>المسار المالي</span><h2>الأهداف المالية</h2><p>الأهداف التي يقودها البنك وتقدم تمويل الدورة.</p></div><Link href="/goals">إدارة الأهداف</Link></div>
        <div className="namaa-bank-goal-metrics"><article><span>أهداف نشطة</span><strong>{dashboardData.activeGoalCount}</strong></article><article><span>المتبقي</span><strong>{formatSar(String(dashboardData.goalsRemaining))}</strong></article><article><span>فجوة الدورة</span><strong>{formatSar(String(dashboardData.goalsGap))}</strong></article></div>
        <div className="namaa-banks-goals-list">{bank.goals.map(goal=><article key={goal}><LucideIcon name="circleCheck" size={20}/><div><strong>{goal}</strong><small>يظهر أثره في مؤشرات البنك وقرارات الدورة.</small></div></article>)}</div>
      </>}

      {selectedTab==='investments'&&<>
        <div className="namaa-bank-panel-head"><div><span>النمو والحماية</span><h2>الاستثمار والادخار</h2><p>{selected==='assets'?'إدارة الأصول والادخار وربط أي إضافة جديدة بالأهداف.':'عرض أثر الادخار والاستثمار على وضع البنك.'}</p></div></div>
        <div className="namaa-bank-investment-grid">
          <article><span>الادخار المحول</span><strong>{formatSar(String(dashboardData.savingsActual))}</strong><small>{savingsProgress==null?'لا يوجد مخصص حالي':savingsProgress+'٪ من المخصص'}</small><Link href="/savings">فتح الادخار</Link></article>
          <article><span>صندوق الطوارئ</span><strong>{formatSar(String(dashboardData.emergencyBalance))}</strong><small>{dashboardData.emergencyCoverageMonths==null?'التغطية غير مكتملة':dashboardData.emergencyCoverageMonths+' شهر تغطية'}</small><Link href="/emergency">فتح الطوارئ</Link></article>
          <article><span>الحسابات المرتبطة</span><strong>{dashboardData.activeAccountCount}</strong><small>حساب نشط</small><Link href="/accounts">إضافة أو إدارة حساب</Link></article>
          <article><span>المحفظة الاستثمارية</span><strong>فتح الإدارة</strong><small>إدارة الأصول والفرص المرتبطة</small><Link href="/investments">فتح الاستثمارات</Link></article>
        </div>
      </>}

      {selectedTab==='policies'&&<>
        <div className="namaa-bank-panel-head"><div><span>الحوكمة والقرارات</span><h2>السياسات والإجراءات</h2><p>عرض ما هو مسجل فعليًا دون إنشاء حالات افتراضية.</p></div><Link href="/governance">فتح الحوكمة</Link></div>
        {selected==='solvency'&&<div className="namaa-bank-buffer-card"><span>سياسة الاحتياطي المالي</span><strong>{dashboardData.bufferPolicy?policyLabel(dashboardData.bufferPolicy.mode):'لا توجد سياسة احتياطي نشطة'}</strong>{dashboardData.bufferPolicy?<small>{dashboardData.bufferPolicy.mode==='FIXED'||dashboardData.bufferPolicy.mode==='MAX_FIXED_PERCENT'?formatSar(dashboardData.bufferPolicy.fixedAmount):''}{dashboardData.bufferPolicy.percentBps>0?' · '+(dashboardData.bufferPolicy.percentBps/100).toFixed(2)+'٪ من الدخل':''}</small>:null}</div>}
        <div className="namaa-bank-decisions-list">{dashboardData.latestDecisions.length===0?<div className="namaa-banks-empty"><strong>لا توجد قرارات بنكية مسجلة</strong><p>عند تسجيل قرار أو تعديل سيظهر هنا.</p></div>:dashboardData.latestDecisions.map(item=><article key={item.id}><div><strong>{item.reason??'قرار بنكي مسجل'}</strong><span>{item.sourceType==='SYSTEM'?'قرار نظام':'قرار مستخدم'} · {new Date(item.createdAt).toLocaleDateString('ar-SA')}</span></div><b>{item.affectedCount} متأثر</b></article>)}</div>
        <div className="namaa-bank-policy-links"><Link href="/governance/procedures">الإجراءات</Link><Link href="/decision-log">سجل القرارات</Link><Link href="/governance/authorization-matrix">الصلاحيات</Link></div>
      </>}

      {selectedTab==='team'&&<>
        <div className="namaa-bank-panel-head"><div><span>الفريق الخوارزمي</span><h2>{bank.name}</h2><p>المسؤولون الذين يتابعون هذا البنك ويجتمعون في غرفة واحدة عند فتح المحادثة.</p></div><LucideIcon name="circleUserRound" size={20}/></div>
        <div className="namaa-banks-team-list namaa-banks-team-grid">{bank.team.map(member=><article key={member.key}><span className="namaa-banks-persona" aria-hidden="true"><Image src={NAMAA_PERSONA_ASSETS[member.key]??'/brand/personas/central-governor.webp'} alt="" fill unoptimized sizes="72px"/></span><div><strong>{member.name}</strong></div></article>)}</div>
        <Link href={'/conversations?room='+selected} className="namaa-banks-chat-link"><LucideIcon name="messageSquareText" size={20}/><span>فتح محادثة جماعية مع فريق {bank.name}</span></Link>
      </>}
    </section>
  </section>;
}
