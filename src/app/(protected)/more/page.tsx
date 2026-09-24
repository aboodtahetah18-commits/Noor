import Link from 'next/link';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { PageHeader } from '@/components/ui';

type NavItem=[string,string,string,LucideIconName];
type NavGroup={id:string;title:string;hint:string;icon:LucideIconName;items:NavItem[]};

const baseGroups:NavGroup[] = [
  { id:'money', title:'إدارة المال', hint:'الحسابات والالتزامات والأهداف والحماية', icon:'walletCards', items:[
    ['/accounts','الحسابات','البنوك والحسابات النقدية والتوفير','landmark'],
    ['/obligations','الالتزامات','المستحقة والقادمة والمتأخرة','creditCard'],
    ['/savings','الادخار','المخطط والمحوّل فعليًا','banknote'],
    ['/emergency','صندوق الطوارئ','الرصيد والمساهمات والسحوبات','lockKeyhole'],
    ['/goals','الأهداف','متابعة الأهداف والمساهمات','target'],
  ]},
  { id:'analysis', title:'التحليل والمتابعة', hint:'القضايا والتقارير والتنبيهات والقرارات', icon:'chart', items:[
    ['/cases','القضايا والقرارات','متابعة مسار القرار والخطوة التالية','listChecks'],
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

export default async function MorePage(){
  const user=await requireAuthenticatedUser();
  const authorizationAdmin=await authorizationRepository.authorize({
    actorUserId:user.id,
    action:'ADMINISTER',
    resource:{objectType:'AUDIT_EVENT',objectId:'authorization-admin-navigation'},
  });

  const groups=baseGroups.map((group)=>group.id==='admin' && authorizationAdmin.decision==='ALLOW'
    ? {...group,items:[
        ...group.items,
        ['/governance/authorization','إدارة الصلاحيات','الأدوار والمنح والتفويضات والوصول الطارئ','lockKeyhole'] as NavItem,
        ['/governance/authorization/templates','قوالب الصلاحيات','قوالب منح رسمية تخضع لنفس دورة الاعتماد والتطبيق','listChecks'] as NavItem,
      ]}
    : group);

  return <main className="app-page more-hub-page p47-shell p47-closure-page namaa-more-page" data-p47-shell="true" dir="rtl">
    <div className="page-shell more-hub-shell">
      <PageHeader className="page-header more-hub-header namaa-migrated-header" eyebrow="المزيد" title="كل وحدات النظام" description="اختر القسم ثم انتقل مباشرة إلى الوحدة المطلوبة."/>

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
