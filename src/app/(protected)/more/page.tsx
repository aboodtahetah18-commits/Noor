import Link from 'next/link';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';

const groups: Array<{
  id:string;
  title:string;
  hint:string;
  icon:LucideIconName;
  items:Array<[string,string,string,LucideIconName]>;
}> = [
  { id:'money', title:'إدارة المال', hint:'الحسابات والالتزامات والأهداف والحماية', icon:'walletCards', items:[
    ['/accounts','الحسابات','البنوك والحسابات النقدية والتوفير','landmark'],
    ['/obligations','الالتزامات','المستحقة والقادمة والمتأخرة','creditCard'],
    ['/savings','الادخار','المخطط والمحوّل فعليًا','banknote'],
    ['/emergency','صندوق الطوارئ','الرصيد والمساهمات والسحوبات','lockKeyhole'],
    ['/goals','الأهداف','متابعة الأهداف والمساهمات','target'],
  ]},
  { id:'analysis', title:'التحليل والمتابعة', hint:'التقارير والتنبيهات والقرارات', icon:'chart', items:[
    ['/reports','التقارير','الدورات والتاريخ والمقارنات','chart'],
    ['/alerts','التنبيهات','ما يحتاج انتباهك الآن','bell'],
    ['/decision-log','سجل القرارات','تتبع القرارات وأثرها','listChecks'],
    ['/workspace','مركز النظام','جميع الوحدات في مكان واحد','layoutGrid'],
  ]},
  { id:'admin', title:'الإدارة', hint:'المراجع والتصنيفات والسياسات', icon:'settings', items:[
    ['/budget-categories','بنود الميزانية','إدارة الفئات والتصنيفات المرجعية','listChecks'],
    ['/merchants','التجار','الأسماء البديلة وقواعد المطابقة','store'],
    ['/internal-funding','التمويل الداخلي','التمويل والاسترداد وحساب الطوارئ','banknote'],
    ['/settings','الإعدادات','الملف والإشعارات والأمان والبيانات','settings'],
  ]},
];

export default function MorePage(){
  return <main className="app-page more-hub-page p47-shell p47-closure-page" data-p47-shell="true" dir="rtl">
    <div className="page-shell more-hub-shell">
      <header className="page-header more-hub-header">
        <div>
          <p className="eyebrow">المزيد</p>
          <h1>كل وحدات النظام</h1>
          <p className="muted">اختر القسم ثم انتقل مباشرة إلى الوحدة المطلوبة.</p>
        </div>
      </header>

      <div className="more-hub-sections">
        {groups.map(group=><section className="more-hub-section" key={group.id} aria-labelledby={`more-${group.id}`}>
          <header className="more-hub-section-head">
            <LucideIcon name={group.icon} size={24}/>
            <div>
              <h2 id={`more-${group.id}`}>{group.title}</h2>
              <p>{group.hint}</p>
            </div>
          </header>
          <div className="more-hub-grid">
            {group.items.map(([href,title,description,icon])=><Link key={href} href={href} className="more-hub-card">
              <span className="more-hub-card-icon"><LucideIcon name={icon} size={24}/></span>
              <div>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
              <LucideIcon name="chevronLeft" size={20}/>
            </Link>)}
          </div>
        </section>)}
      </div>
    </div>
  </main>;
}
