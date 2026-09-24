import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

const sections = [
  { href: '/governance/authorization', title: 'مصفوفة الصلاحيات', description: 'الصلاحيات، التفويض، ومسارات الاعتماد.' },
  { href: '/cases', title: 'القرارات والقضايا', description: 'ربط المعرفة بمسارات القرار والتنفيذ.' },
  { href: '/reports/learning', title: 'مراجعة المعرفة', description: 'ملاحظات الخوارزميات والتعلم والمراجعات.' },
  { href: '/conversations', title: 'مناقشة المعرفة', description: 'فتح نقاش مع أمين السر والجهة المختصة.' },
];

export default function GovernancePage() {
  return (
    <main className="namaa-knowledge-page" dir="rtl">
      <section className="namaa-knowledge-shell">
        <header className="namaa-knowledge-hero namaa-wide-card">
          <div>
            <p>المرجع المؤسسي</p>
            <h1>المعرفة</h1>
            <span>المصدر المعتمد للسياسات واللوائح والإجراءات ومصفوفة الصلاحيات.</span>
          </div>
          <LucideIcon name="receiptText" size={32} />
        </header>

        <div className="namaa-knowledge-grid">
          <aside className="namaa-knowledge-nav namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>مكتبة المعرفة</p><h2>الأقسام</h2></div>
              <LucideIcon name="search" size={20} />
            </div>
            <nav>
              <Link href="/governance/policies">السياسات</Link>
              <Link href="/governance/regulations">اللوائح</Link>
              <Link href="/governance/procedures">الإجراءات</Link>
              <Link href="/governance/authorization">مصفوفة الصلاحيات</Link>
            </nav>
          </aside>

          <section className="namaa-knowledge-main namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>المصدر النافذ</p><h2>إدارة المعرفة المؤسسية</h2></div>
              <LucideIcon name="receiptText" size={20} />
            </div>
            <div className="namaa-knowledge-summary">
              <strong>المعرفة هنا مرجع تشغيلي، وليست مكتبة ملفات فقط.</strong>
              <p>تستخدمها الخوارزميات للتحقق من السياسات واللوائح والإجراءات والصلاحيات قبل إصدار التوصيات أو تمرير القرارات.</p>
            </div>
            <div className="namaa-knowledge-cards">
              {sections.map(section => (
                <Link key={section.title} href={section.href}>
                  <strong>{section.title}</strong>
                  <span>{section.description}</span>
                  <LucideIcon name="chevronLeft" size={20} />
                </Link>
              ))}
            </div>
          </section>

          <aside className="namaa-knowledge-review namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>مراجعة الخوارزميات</p><h2>ما يحتاج انتباهًا</h2></div>
              <LucideIcon name="triangleAlert" size={20} />
            </div>
            <article>
              <strong>تعارض بين مرجعين</strong>
              <p>يُرفع للمراجعة البشرية ولا يُحسم تلقائيًا.</p>
            </article>
            <article>
              <strong>تصحيح تحريري</strong>
              <p>يمكن معالجة الأخطاء التقنية الواضحة مع تسجيل الأثر.</p>
            </article>
            <article>
              <strong>تحليل أثر قبل التعديل</strong>
              <p>أي تعديل جوهري يوضح البنوك والقرارات والأهداف المتأثرة قبل الحفظ.</p>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}
