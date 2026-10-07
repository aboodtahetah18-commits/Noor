import Image from 'next/image';
import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { AddInvestmentPortfolioDialog } from './investment-action-dialogs';
import { NAMAA_PERSONA_ASSETS } from '@/components/conversations/persona-assets';

type InvestmentTab='overview'|'portfolio'|'analysis'|'followup'|'team';
const tabs:{key:InvestmentTab;label:string}[]=[
  {key:'overview',label:'نظرة عامة'},
  {key:'portfolio',label:'المحافظ والأصول'},
  {key:'analysis',label:'الأداء والمخاطر'},
  {key:'followup',label:'المتابعة'},
  {key:'team',label:'الفريق الخوارزمي'},
];

export default async function InvestmentsPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const q=await searchParams;
  const active:InvestmentTab=(q.tab==='portfolio'||q.tab==='analysis'||q.tab==='followup'||q.tab==='team')?q.tab:'overview';
  return (
    <main className="namaa-focus-page namaa-investments-page" dir="rtl">
      <header className="namaa-focus-hero namaa-investments-header">
        <div className="namaa-investments-hero-copy">
          <p>بنك الأصول الاستثمارية</p>
          <h1>الاستثمارات</h1>
          <span>المحافظ والأصول والأداء والمخاطر.</span>
        </div>
        <div className="namaa-investments-hero-actions">
          <AddInvestmentPortfolioDialog />
        </div>
      </header>

      <nav className="namaa-focus-tabs" aria-label="أقسام الاستثمارات">
        {tabs.map(tab=><Link key={tab.key} href={'/investments?tab='+tab.key} className={active===tab.key?'is-active':''}>{tab.label}</Link>)}
      </nav>

      <section className="namaa-focus-panel">
        {active==='overview'&&<>
          <div className="namaa-focus-panel-head"><div><span>الوضع الحالي</span><h2>المحفظة الاستثمارية</h2></div><LucideIcon name="chart" size={20}/></div>
          <div className="namaa-focus-metrics">
            <article><div><span>المحافظ</span><small>تظهر بعد الربط</small></div><strong>—</strong></article>
            <article><div><span>قيمة الأصول</span><small>لا يوجد مصدر محفظة فعلي بعد</small></div><strong>—</strong></article>
            <article><div><span>السيولة الاستثمارية</span><small>بحسب الأصول القابلة للتسييل</small></div><strong>—</strong></article>
            <article><div><span>تنبيهات المخاطر</span><small>تظهر عند وجود حالة فعلية</small></div><strong>0</strong></article>
          </div>
          <div className="namaa-focus-empty"><LucideIcon name="landmark" size={24}/><div><strong>لا توجد محفظة مختارة حاليًا</strong><span>استخدم تبويب المحافظ والأصول لإضافة أو ربط البيانات عند توفر مصدر فعلي.</span></div></div>
        </>}

        {active==='portfolio'&&<>
          <div className="namaa-focus-panel-head"><div><span>المحافظ والأصول</span><h2>إدارة المحفظة</h2></div><AddInvestmentPortfolioDialog /></div>
          <div className="namaa-focus-action-grid">
            <article className="is-green"><LucideIcon name="walletCards" size={20}/><div><strong>المحافظ الاستثمارية</strong><span>تعريف المحفظة وبياناتها الأساسية.</span></div><AddInvestmentPortfolioDialog /></article>
            <article className="is-gold"><LucideIcon name="landmark" size={20}/><div><strong>الحسابات المرتبطة</strong><span>أضف أو عدّل الحساب الذي يغذي الاستثمار.</span></div><Link href="/accounts">فتح الحسابات</Link></article>
            <article className="is-blue"><LucideIcon name="target" size={20}/><div><strong>الأهداف المالية</strong><span>اربط الاستثمار بهدف مالي قابل للقياس.</span></div><Link href="/goals">فتح الأهداف</Link></article>
            <article className="is-purple"><LucideIcon name="chart" size={20}/><div><strong>السجل المالي</strong><span>راجع التدفقات الداخلة والخارجة المرتبطة.</span></div><Link href="/transactions">فتح العمليات</Link></article>
          </div>
        </>}

        {active==='analysis'&&<>
          <div className="namaa-focus-panel-head"><div><span>الأداء والمخاطر</span><h2>التحليل الاستثماري</h2></div><Link href="/advisor">فتح مختبر الخوارزميات</Link></div>
          <div className="namaa-focus-metrics">
            <article><div><span>الأداء</span><small>بعد اختيار محفظة</small></div><strong>—</strong></article>
            <article><div><span>المخاطر</span><small>تقييم مستمر</small></div><strong>—</strong></article>
            <article><div><span>السيولة</span><small>حسب الأصول القابلة للتسييل</small></div><strong>—</strong></article>
            <article><div><span>التوصيات</span><small>تحتاج اعتماد المستخدم</small></div><strong>0</strong></article>
          </div>
          <div className="namaa-focus-empty"><LucideIcon name="chart" size={24}/><div><strong>لا توجد بيانات محفظة كافية للتحليل</strong><span>لن نعرض أداءً أو مخاطرة افتراضية قبل وجود بيانات فعلية.</span></div></div>
        </>}

        {active==='followup'&&<>
          <div className="namaa-focus-panel-head"><div><span>المتابعة</span><h2>ما يحتاج انتباهًا</h2></div><Link href="/reports">فتح المرصد</Link></div>
          <div className="namaa-focus-list">
            <article><strong>إضافة منتج أو صندوق</strong><span>يظهر كعنصر متابعة عند وجود بيانات مرتبطة.</span></article>
            <article><strong>مراجعة أصل ضعيف</strong><span>لا يظهر تنبيه فعلي قبل توفر أداء موثق.</span></article>
            <article><strong>تحديث النتائج</strong><span>يمكن إرسال التحديث مباشرة إلى فريق البنك.</span></article>
          </div>
        </>}

        {active==='team'&&<>
          <div className="namaa-focus-panel-head"><div><span>الفريق الخوارزمي</span><h2>فريق بنك الأصول الاستثمارية</h2></div><LucideIcon name="circleUserRound" size={20}/></div>
          <div className="namaa-focus-team-grid">
            <article><span><Image src={NAMAA_PERSONA_ASSETS['assets-manager']!} alt="" fill unoptimized sizes="64px"/></span><strong>مدير بنك الأصول</strong></article>
            <article><span><Image src={NAMAA_PERSONA_ASSETS['investment-owner']!} alt="" fill unoptimized sizes="64px"/></span><strong>مسؤول الاستثمار</strong></article>
            <article><span><Image src={NAMAA_PERSONA_ASSETS['goals-owner']!} alt="" fill unoptimized sizes="64px"/></span><strong>مسؤول الأهداف</strong></article>
          </div>
          <Link href="/conversations?room=assets" className="namaa-focus-primary-action"><LucideIcon name="messageSquareText" size={20}/><span>فتح محادثة جماعية مع فريق بنك الأصول</span></Link>
        </>}
      </section>
    </main>
  );
}
