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

type RecentApproved = {
  id:string;
  transactionDate:string;
  description:string;
  amount:string;
  transactionType:string;
  accountName:string;
  categoryName:string|null;
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
  goalsApprovedThisCycle:number;
  goalsRequiredThisCycle:number;
  emergencyBalance:number;
  emergencyProgress:number;
  emergencyCoverageMonths:number|null;
  savingsActual:number;
  savingsPlanned:number;
  pendingImportsCount:number;
  duplicateCandidatesCount:number;
  unclassifiedCount:number;
  activeFundingCount:number;
  recentApproved:RecentApproved[];
};

function clampPercent(value:number){
  return Math.max(0,Math.min(100,Math.round(value)));
}

export function BanksWide({selected,pendingReviewCount,pendingItems,dashboardData}:{selected:BankKey;pendingReviewCount:number;pendingItems:PendingItem[];dashboardData:DashboardData}){
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

  return <section className="namaa-wide-only namaa-banks-wide" dir="rtl">
    <header className="namaa-banks-hero namaa-wide-card">
      <div><p>غرفة القيادة</p><h1>البنوك</h1><span>لوحة فعلية مبنية على بيانات نماء الحالية؛ أي مؤشر غير مربوط يظهر كبيانات غير مكتملة بدل إنشاء رقم تقديري.</span></div>
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
        <section className="namaa-banks-chat-preview" aria-label="معاينة محادثة البنك">
          <header>
            <div><span>موجز المحادثة</span><strong>{bank.name}</strong></div>
            <LucideIcon name="messageSquareText" size={20}/>
          </header>
          <div className="namaa-banks-chat-preview-body">
            <div className="namaa-banks-chat-empty">
              <LucideIcon name="messageSquareText" size={20}/>
              <p>لا توجد رسائل مرتبطة بهذا البنك للعرض هنا حاليًا.</p>
            </div>
          </div>
          <footer>
            <span>ستظهر آخر الرسائل هنا عند توفرها.</span>
            <Link href="/conversations">عرض المحادثة الكاملة</Link>
          </footer>
        </section>
      </aside>

      <section className="namaa-banks-dashboard namaa-wide-panel">
        <div className="namaa-investments-section-title"><div><p>المؤشرات المالية الفعلية</p><h2>{bank.name}</h2></div><LucideIcon name="chart" size={20}/></div>
        <p className="namaa-banks-subtitle">{bank.subtitle} · الأرقام أدناه مجمعة من حساب المستخدم الحالي وليست افتراضات خاصة بالبنك المختار.</p>

        <div className="namaa-banks-kpis namaa-banks-kpis-dashboard">
          <article className="tone-base"><span>إجمالي السيولة</span><strong>{formatSar(String(dashboardData.totalLiquidity))}</strong><small>{dashboardData.activeAccountCount} حساب نشط</small></article>
          <article className="tone-accent"><span>عمليات تحتاج مراجعة</span><strong>{pendingReviewCount}</strong><small>{formatSar(String(pendingValue))} قيمة معلقة</small></article>
          <article className="tone-base"><span>صندوق الطوارئ</span><strong>{formatSar(String(dashboardData.emergencyBalance))}</strong><small>{emergencyProgress==null?'بيانات التغطية غير مكتملة':`${emergencyProgress}٪ من الهدف`}{dashboardData.emergencyCoverageMonths!=null?` · ${dashboardData.emergencyCoverageMonths} شهر`:''}</small></article>
          <article className="tone-base"><span>الأهداف النشطة</span><strong>{dashboardData.activeGoalCount}</strong><small>{formatSar(String(dashboardData.goalsRemaining))} متبقي</small></article>
          <article className="tone-base"><span>الادخار المحول</span><strong>{formatSar(String(dashboardData.savingsActual))}</strong><small>{savingsProgress==null?'لا يوجد مخصص ادخار حالي':`${savingsProgress}٪ من المخصص`}</small></article>
          <article className="tone-base"><span>تمويل داخلي نشط</span><strong>{dashboardData.activeFundingCount}</strong><small>{dashboardData.pendingImportsCount} كشف/دفعة تحتاج مراجعة</small></article>
        </div>

        <section className="namaa-banks-visual-dashboard">
          <article className="namaa-bank-donut-card tone-base">
            <div>
              <span>اتجاه قيمة العمليات المعلقة</span>
              <strong>{debitShare==null?'لا توجد عمليات معلقة':`${debitShare}٪ مصروفات/خصم`}</strong>
              <small>{debitShare==null?'لا توجد بيانات لرسم النسبة حاليًا.':`خصم ${formatSar(String(debitValue))} · إضافة ${formatSar(String(creditValue))}`}</small>
            </div>
            {debitShare==null?<div className="namaa-bank-no-chart">لا بيانات</div>:<div className="namaa-bank-donut" style={{'--namaa-donut-share':`${debitShare}%`} as React.CSSProperties}><b>{debitShare}٪</b></div>}
          </article>

          <article className="namaa-bank-progress-card tone-base">
            <div><span>تمويل أهداف الدورة</span><strong>{goalCycleProgress==null?'بيانات الدورة غير مكتملة':`${goalCycleProgress}٪`}</strong><small>{goalCycleProgress==null?'لا يوجد مبلغ مطلوب مسجل للدورة الحالية.':`معتمد ${formatSar(String(dashboardData.goalsApprovedThisCycle))} من ${formatSar(String(dashboardData.goalsRequiredThisCycle))}`}</small></div>
            {goalCycleProgress==null?<div className="namaa-bank-no-chart">لا يوجد مسار نسبة حالي</div>:<div className="namaa-bank-progress-track"><i style={{width:`${goalCycleProgress}%`}}/></div>}
            <div className="namaa-bank-progress-split"><span>فجوة الدورة</span><b>{formatSar(String(dashboardData.goalsGap))}</b></div>
          </article>

          <article className="namaa-bank-bars-card tone-base">
            <div><span>أعلى العمليات المعلقة</span><strong>{pendingItems.length?Math.min(5,pendingItems.length):0} عملية</strong><small>القيمة الفعلية لكل عملية مقارنة بأعلى عملية معلقة حاليًا.</small></div>
            <div className="namaa-bank-bars">
              {pendingItems.slice(0,5).map(item=><div key={item.rowId}><span>{item.description}</span><i style={{width:`${Math.max(6,(Math.abs(Number(item.amount)||0)/maxPending)*100)}%`}}/><b>{formatSar(item.amount)}</b></div>)}
              {pendingItems.length===0?<p>لا توجد عمليات معلقة لعرضها.</p>:null}
            </div>
          </article>
        </section>

        <section className="namaa-banks-health-grid">
          <article><span>تكرارات محتملة</span><strong>{dashboardData.duplicateCandidatesCount}</strong><small>من العمليات التي ما زالت قيد المراجعة</small></article>
          <article><span>عمليات غير مصنفة</span><strong>{dashboardData.unclassifiedCount}</strong><small>مصروفات أو رسوم بدون بند حالي</small></article>
          <article><span>آخر عمليات معتمدة</span><strong>{dashboardData.recentApproved.length}</strong><small>{formatSar(String(recentApprovedValue))} قيمة آخر سجل محمّل</small></article>
          <article className="is-incomplete"><span>بيانات الاستثمارات</span><strong>غير مكتملة</strong><small>لا يوجد مصدر محفظة فعلي مربوط بهذه اللوحة حتى الآن.</small><Link href="/investments">فتح الاستثمارات</Link></article>
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
