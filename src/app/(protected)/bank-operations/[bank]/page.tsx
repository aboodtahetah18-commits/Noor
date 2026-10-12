import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { getGoalCycleReadiness } from '@/features/goals/queries/get-goal-cycle-readiness';
import { getEmergencySummary } from '@/features/emergency/queries/get-emergency-summary';
import { getSavingsSummary } from '@/features/savings/queries/get-savings-summary';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import { SaudiAmount } from '@/components/ui/saudi-amount';

type InstitutionalBank={name:string;subtitle:string;icon:LucideIconName;purpose:string;team:readonly string[];goals:readonly string[];destination:string;tone:string};
const banks:Record<string,InstitutionalBank>={
 central:{name:'بنك نماء المركزي',subtitle:'الحوكمة والرقابة',icon:'landmark',purpose:'متابعة سلامة القرار المالي واتساق أعمال الجهات البنكية الأربع.',team:['محافظ بنك نماء المركزي','مدير بنك نماء المركزي','المستشار الاقتصادي','أمين السر المركزي'],goals:['الاستقرار المالي','سلامة السيولة','اتساق القرارات بين البنوك'],destination:'/governance',tone:'central'},
 hilal:{name:'بنك الهلال',subtitle:'التمويل الداخلي والالتزامات',icon:'repeat2',purpose:'إدارة التمويل الداخلي ومتابعة الالتزامات والضغط المالي.',team:['مدير بنك الهلال','مسؤول الالتزامات','مسؤول الميزانية والإنفاق'],goals:['ضبط التمويل الداخلي','خفض ضغط الالتزامات','رفع وضوح التدفقات'],destination:'/internal-funding',tone:'hilal'},
 solvency:{name:'بنك ملاءة',subtitle:'الحماية والاحتياطي',icon:'lockKeyhole',purpose:'متابعة صندوق الطوارئ والادخار وحماية الاحتياطي والسيولة.',team:['مدير بنك ملاءة','مسؤول السيولة والحماية','مسؤول الالتزامات'],goals:['رفع هامش الأمان','حماية الاحتياطي','تخفيف مخاطر السيولة'],destination:'/emergency',tone:'solvency'},
 assets:{name:'بنك الأصول الاستثمارية',subtitle:'الأصول والاستثمار والأهداف',icon:'chart',purpose:'متابعة الاستثمارات والأصول وربط الفرص بالأهداف المالية.',team:['مدير بنك الأصول','مسؤول الاستثمار','مسؤول الأهداف'],goals:['تحسين جودة المحافظ','ضبط مخاطر الاستثمار','ربط الاستثمار بالأهداف'],destination:'/investments',tone:'assets'},
};


const bankSections:Record<string,readonly {title:string;description:string;href:string;icon:LucideIconName}[]>={
 central:[
  {title:'الحوكمة والقرارات',description:'السياسات والمراجعات والاعتمادات',href:'/governance',icon:'landmark'},
  {title:'مركز العمليات',description:'متابعة الاستثناءات والمراجعات',href:'/bank-operations',icon:'listChecks'},
  {title:'التقارير المركزية',description:'مؤشرات المنظومة وتحليل الأداء',href:'/reports',icon:'chart'},
 ],
 hilal:[
  {title:'التمويل الداخلي',description:'التمويلات والجداول والمتابعة',href:'/internal-funding',icon:'repeat2'},
  {title:'الالتزامات',description:'المستحقات والمدفوعات القادمة',href:'/obligations',icon:'receiptText'},
  {title:'العمليات',description:'الحركة المالية وسجل المعاملات',href:'/transactions',icon:'arrowUpDown'},
 ],
 solvency:[
  {title:'صندوق الطوارئ',description:'الرصيد المستهدف والتغطية',href:'/emergency',icon:'lockKeyhole'},
  {title:'الادخار',description:'الأرصدة والتحويلات وخطط الادخار',href:'/savings',icon:'banknote'},
  {title:'تقارير الأمان',description:'الضغط المالي ومؤشرات الحماية',href:'/reports',icon:'chart'},
 ],
 assets:[
  {title:'الاستثمارات',description:'المحفظة والأداء والعوائد',href:'/investments',icon:'chart'},
  {title:'الأهداف المالية',description:'متابعة الأهداف والتقدم',href:'/goals',icon:'target'},
  {title:'التقارير',description:'قراءة أداء الأصول والاستثمارات',href:'/reports',icon:'receiptText'},
 ],
};

export default async function InstitutionalBankPage({params}:{params:Promise<{bank:string}>}){
 const {bank:key}=await params;
 const bank=banks[key];
 if(!bank)notFound();
 const user=await requireAuthenticatedUser();
 const [center,goals,emergency,savings]=await Promise.all([
  getDailyBankOperationsCenter(user.id),
  getGoalCycleReadiness(user.id).catch(()=>({cycle:null,items:[]})),
  getEmergencySummary(user.id).catch(()=>null),
  getSavingsSummary(user.id).catch(()=>null),
 ]);
 const primary=key==='central'?{label:'عمليات تحت المراجعة',value:String(center.pendingReviewCount),note:'إجراءات تحتاج إلى متابعة'}:key==='hilal'?{label:'التمويل الداخلي النشط',value:String(center.activeFundingCount),note:'ملفات تمويل قيد المتابعة'}:key==='solvency'?{label:'صندوق الطوارئ',value:null,note:'رصيد الحماية والسيولة الاحتياطية'}:{label:'الأهداف المالية',value:String(goals.items.length),note:'أهداف مسجلة في المنظومة'};
 return <main className="namaa-approved-finance namaa-system-bank-detail namaa-v2 namaa-v2-bank-detail" dir="rtl">
  <Link href="/bank-operations" className="namaa-system-bank-back"><LucideIcon name="chevronRight" size={20}/> بنوك نماء</Link>
  <header className={`namaa-system-bank-detail-heading tone-${bank.tone}`}>
   <span><LucideIcon name={bank.icon} size={32}/></span><div><h1>{bank.name}</h1><p>{bank.subtitle}</p></div>
  </header>
  <section className={`namaa-v2-bank-detail__hero tone-${bank.tone}`} aria-label="ملخص البنك"><span>{primary.label}</span><strong>{primary.value===null?(emergency?<SaudiAmount value={String(emergency.currentBalance??0)}/>:'غير متاح'):primary.value}</strong><small>{primary.note}</small></section>
  <p className="namaa-system-bank-purpose">{bank.purpose}</p>
  <section className="namaa-system-bank-detail-panel">
   <h2>المؤشرات الحالية</h2>
   <div className="namaa-system-bank-facts">
    {key==='central'?<><div><span>عمليات تحتاج مراجعة</span><strong>{center.pendingReviewCount}</strong></div><div><span>عمليات غير مصنفة</span><strong>{center.unclassifiedCount}</strong></div></>:null}
    {key==='hilal'?<><div><span>تمويل داخلي نشط</span><strong>{center.activeFundingCount}</strong></div><div><span>كشوف تحتاج مراجعة</span><strong>{center.pendingImportsCount}</strong></div></>:null}
    {key==='solvency'?<><div><span>رصيد صندوق الطوارئ</span><strong>{emergency?<SaudiAmount value={String(emergency.currentBalance??0)}/>: 'غير متاح'}</strong></div><div><span>الادخار الفعلي</span><strong>{savings?<SaudiAmount value={String(savings.actualTransferredAmount??0)}/>: 'غير متاح'}</strong></div></>:null}
    {key==='assets'?<><div><span>الأهداف المسجلة</span><strong>{goals.items.length}</strong></div><div><span>بيانات المحافظ</span><strong>تظهر في وحدة الاستثمارات</strong></div></>:null}
   </div>
  </section>
  <section className="namaa-v2-bank-detail__sections" aria-label="الأقسام الداخلية للبنك"><h2>الأقسام الداخلية</h2><div className="namaa-v2-bank-detail__grid">{bankSections[key].map(item=><Link key={item.href} href={item.href} className="namaa-v2-bank-detail__section"><span className="namaa-v2-bank-detail__section-icon"><LucideIcon name={item.icon} size={20}/></span><strong>{item.title}</strong><small>{item.description}</small><LucideIcon name="chevronLeft" size={16}/></Link>)}</div></section>
  <details className="namaa-v2-bank-detail__secondary"><summary>الفريق المسؤول</summary><div className="namaa-system-bank-people">{bank.team.map(name=><div key={name}><LucideIcon name="circleUserRound" size={20}/><span>{name}</span></div>)}</div></details>
  <details className="namaa-v2-bank-detail__secondary"><summary>الأهداف والاختصاصات</summary><div className="namaa-system-bank-people">{bank.goals.map(goal=><div key={goal}><LucideIcon name="circleCheck" size={20}/><span>{goal}</span></div>)}</div></details>
  <nav className="namaa-system-bank-actions" aria-label="إجراءات البنك">
   <Link href={bank.destination}><LucideIcon name="layoutGrid" size={20}/> الوحدة المرتبطة</Link>
   <Link href="/conversations"><LucideIcon name="messageSquareText" size={20}/> المحادثات</Link>
   <Link href="/bank-statements"><LucideIcon name="receiptText" size={20}/> الكشوف</Link>
  </nav>
 </main>;
}
