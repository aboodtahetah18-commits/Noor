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
  amount:number|string;
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

export function BanksWide({selected,pendingReviewCount,pendingItems}:{selected:BankKey;pendingReviewCount:number;pendingItems:PendingItem[]}){
  const bank=banks[selected];
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
        <div className="namaa-banks-kpis">
          <article><span>العمليات المعلقة</span><strong>{pendingReviewCount}</strong><small>{pendingReviewCount?'تحتاج مراجعة':'لا توجد عمليات معلقة'}</small></article>
          <article><span>المحادثة</span><strong>نشطة</strong><small>ضمن سياق البنك والفريق المختص</small></article>
          <article><span>القرارات</span><strong>محكومة</strong><small>لا تنفيذ مالي تلقائي</small></article>
          <article><span>المتابعة</span><strong>مستمرة</strong><small>حتى اكتمال الأثر والإثبات</small></article>
        </div>
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
