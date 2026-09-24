import type React from 'react';
import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { formatSar } from '@/lib/format-money';

type PendingItem = {
  rowId:string;
  description:string;
  bankName?:string|null;
  accountName:string;
  transactionDate?:string|null;
  direction:string;
  amount:string;
  detectedKind:string;
  duplicateCandidate?:boolean;
  importId:string;
};

const KIND:Record<string,string>={EXPENSE:'مصروف',INCOME:'دخل',TRANSFER:'تحويل',REFUND:'استرداد',FEE:'رسوم',UNKNOWN:'غير معروف'};

const banks = {
  central:{name:'بنك نماء المركزي',subtitle:'الحوكمة والاستقرار والرقابة',team:['محافظ بنك نماء المركزي','المستشار الاقتصادي','أمين السر المركزي'],goals:['الاستقرار المالي','سلامة السيولة','اتساق القرارات بين البنوك']},
  hilal:{name:'بنك الهلال',subtitle:'التمويل الداخلي والالتزامات',team:['مدير بنك الهلال','مسؤول الالتزامات','مسؤول الميزانية والإنفاق'],goals:['ضبط التمويل الداخلي','خفض ضغط الالتزامات','رفع وضوح التدفقات']},
  solvency:{name:'بنك ملاءة',subtitle:'الحماية والاحتياطي والسيولة',team:['مدير بنك ملاءة','مسؤول السيولة والحماية','مسؤول الالتزامات'],goals:['رفع هامش الأمان','حماية الاحتياطي','تخفيف مخاطر السيولة']},
  assets:{name:'بنك الأصول الاستثمارية',subtitle:'الأصول والاستثمار والأهداف',team:['مدير بنك الأصول','مسؤول الاستثمار','مسؤول الأهداف'],goals:['تحسين جودة المحافظ','ضبط المخاطر الاستثمارية','ربط الاستثمار بالأهداف']},
} as const;

type BankKey=keyof typeof banks;

type DashboardData={
  activeAccountCount:number;
  totalLiquidity:number;
  activeGoalCount:number;
  goalsRemaining:number;
  goalsGap:number;
  emergencyBalance:number;
  emergencyProgress:number;
  emergencyCoverageMonths:number|null;
  savingsActual:number;
  savingsPlanned:number;
};

export function BanksWide({selected,pendingReviewCount,pendingItems,dashboardData}:{selected:BankKey;pendingReviewCount:number;pendingItems:PendingItem[];dashboardData:DashboardData}){
  const bank=banks[selected];
  const pendingValue=pendingItems.reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);
  const debitValue=pendingItems.filter(item=>item.direction==='DEBIT').reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);
  const creditValue=pendingItems.filter(item=>item.direction!=='DEBIT').reduce((sum,item)=>sum+Math.abs(Number(item.amount)||0),0);
  const debitShare=pendingValue>0?Math.round((debitValue/pendingValue)*100):0;
  const reviewedShare=pendingReviewCount===0?100:Math.max(0,Math.min(95,100-pendingReviewCount*10));
  const savingsProgress=dashboardData.savingsPlanned>0?Math.min(100,Math.round((dashboardData.savingsActual/dashboardData.savingsPlanned)*100)):0;
  const goalFundingProgress=dashboardData.goalsRemaining>0?Math.max(0,Math.min(100,Math.round((1-dashboardData.goalsGap/dashboardData.goalsRemaining)*100))):100;
  const maxPending=Math.max(1,...pendingItems.map(item=>Math.abs(Number(item.amount)||0)));
  return <section className="namaa-wide-only namaa-banks-wide" dir="rtl">
    <header className="namaa-banks-hero namaa-wide-card">
      <div><p>غرفة القيادة</p><h1>البنوك</h1><span>إدارة كل بنك من لوحة واحدة مع فريقه وأهدافه ومسار المحادثة المرتبط به.</span></div>
      <div className="namaa-banks-selector">
        {Object.entries(banks).map(([key,item])=><Link key={key} href={'/bank-operations?bank='+key} className={selected===key?'is-active':''}>{item.name}</Link>)}
      </div>
    </header>

    <div className="namaa-banks-layout">
      <aside className="namaa-banks-team namaa-wide-panel">
        <div className="namaa-investments-section-title"><div><p>الفريق الخوارزمي</p><h2>{bank.name}</h2></div><LucideIcon name="circleUserRound" size={20}/></div>
        <div className="namaa-banks-team-list">
          {bank.team.map((member,index)=><article key={member}><span>{index+1}</span><div><strong>{member}</strong><small>يشارك حسب الاختصاص والسياق</small></div></article>)}
        </div>
        <Link href="/conversations" className="namaa-wide-action"><LucideIcon name="messageSquareText" size={20}/>فتح محادثة البنك</Link>
      </aside>

      <section className="namaa-banks-dashboard namaa-wide-panel">
        <div className="namaa-investments-section-title"><div><p>لوحة البنك</p><h2>{bank.name}</h2></div><LucideIcon name="chart" size={20}/></div>
        <p className="namaa-banks-subtitle">{bank.subtitle}</p>
        <div className="namaa-banks-kpis namaa-banks-kpis-dashboard">
          <article className="tone-gold"><span>إجمالي السيولة</span><strong>{formatSar(String(dashboardData.totalLiquidity))}</strong><small>{dashboardData.activeAccountCount} حساب نشط</small></article>
          <article className="tone-sand"><span>الأهداف النشطة</span><strong>{dashboardData.activeGoalCount}</strong><small>{formatSar(String(dashboardData.goalsRemaining))} متبقي</small></article>
          <article className="tone-green"><span>صندوق الطوارئ</span><strong>{formatSar(String(dashboardData.emergencyBalance))}</strong><small>{Math.round(dashboardData.emergencyProgress)}٪ من الهدف{dashboardData.emergencyCoverageMonths!=null?` · ${dashboardData.emergencyCoverageMonths} شهر تغطية`:''}</small></article>
          <article className="tone-olive"><span>الادخار المحول</span><strong>{formatSar(String(dashboardData.savingsActual))}</strong><small>{savingsProgress}٪ من المخصص</small></article>
        </div>

        <section className="namaa-banks-visual-dashboard">
          <article className="namaa-bank-donut-card tone-deep">
            <div>
              <span>تغطية فجوة الأهداف</span>
              <strong>{goalFundingProgress}٪ ممول</strong>
              <small>{dashboardData.goalsGap>0?`فجوة حالية ${formatSar(String(dashboardData.goalsGap))}`:'لا توجد فجوة تمويل حالية'}</small>
            </div>
            <div className="namaa-bank-donut" style={{'--namaa-donut-share':`${goalFundingProgress}%`} as React.CSSProperties}><b>{goalFundingProgress}٪</b></div>
          </article>
          <article className="namaa-bank-progress-card tone-blue">
            <div><span>جاهزية المراجعة</span><strong>{reviewedShare}٪</strong><small>{pendingReviewCount===0?'كل العمليات الحالية محسومة':`${pendingReviewCount} عملية ما زالت تحتاج مراجعة`}</small></div>
            <div className="namaa-bank-progress-track"><i style={{width:`${reviewedShare}%`}}/></div>
            <div className="namaa-bank-progress-split"><span>القيمة المعلقة</span><b>{formatSar(String(pendingValue))}</b></div>
          </article>
          <article className="namaa-bank-bars-card tone-rose">
            <div><span>أعلى العمليات المعلقة</span><strong>{pendingItems.length?Math.min(5,pendingItems.length):0} عملية</strong><small>القيمة المالية لكل عملية مقارنة بأعلى عملية حالية</small></div>
            <div className="namaa-bank-bars">
              {pendingItems.slice(0,5).map(item=><div key={item.rowId}><span>{item.description}</span><i style={{width:`${Math.max(6,(Math.abs(Number(item.amount)||0)/maxPending)*100)}%`}}/><b>{formatSar(item.amount)}</b></div>)}
              {pendingItems.length===0?<p>لا توجد عمليات معلقة لعرضها.</p>:null}
            </div>
          </article>
        </section>
        <section className="namaa-banks-pending">
          <div className="namaa-investments-section-title"><div><p>ما يحتاج انتباهًا</p><h2>العمليات الحالية</h2></div><span>{pendingReviewCount}</span></div>
          {pendingItems.length===0?<div className="namaa-banks-empty"><strong>لا توجد عمليات معلقة</strong><p>أي عملية تحتاج مراجعة ستظهر هنا مع سببها وخطوتها التالية.</p></div>:<div className="namaa-banks-pending-list">{pendingItems.slice(0,5).map(item=><article key={item.rowId}><div><strong>{item.description}</strong><span>{(item.bankName?item.bankName+' · ':'')+item.accountName+' · '+(item.transactionDate??'بدون تاريخ')}</span></div><b>{item.direction==='DEBIT'?'−':'+'}{formatSar(item.amount)}</b><div><span>{KIND[item.detectedKind]??item.detectedKind}</span>{item.duplicateCandidate?<em>مكرر محتمل</em>:null}<Link href={'/bank-statements/'+item.importId}>مراجعة</Link></div></article>)}</div>}
        </section>
      </section>

      <aside className="namaa-banks-goals namaa-wide-panel">
        <div className="namaa-investments-section-title"><div><p>الأهداف والتطلعات</p><h2>ما الذي يقوده البنك؟</h2></div><LucideIcon name="target" size={20}/></div>
        <div className="namaa-banks-goals-list">
          {bank.goals.map(goal=><article key={goal}><LucideIcon name="circleCheck" size={20}/><div><strong>{goal}</strong><small>أي تعديل جوهري يمر بتحليل أثر قبل الاعتماد.</small></div></article>)}
        </div>
        <Link href="/goals" className="namaa-wide-action-secondary"><LucideIcon name="target" size={20}/>إدارة الأهداف</Link>
      </aside>
    </div>
  </section>;
}
