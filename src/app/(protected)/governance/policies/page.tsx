import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

export default function Page(){
  return <main className="namaa-governance-catalog page-shell" dir="rtl">
    <header className="namaa-governance-catalog-hero">
      <div><p>المعرفة المؤسسية</p><h1>السياسات الحاكمة</h1><span>مرجع السياسات المعتمدة التي تضبط القرارات والتشغيل.</span></div>
      <LucideIcon name="shieldCheck" size={24}/>
    </header>
    <section className="namaa-governance-catalog-grid">
      <article><span>المرجع</span><strong>السياسات</strong><p>يعرض هذا القسم المواد المعتمدة المرتبطة بهذا النوع من المعرفة.</p></article>
      <article><span>الصلاحيات</span><strong>مسار الاعتماد</strong><p>راجع من يملك الإنشاء والتعديل والاعتماد قبل أي تغيير.</p><Link href="/governance/authorization">فتح مصفوفة الصلاحيات</Link></article>
      <article><span>الأثر</span><strong>القرارات المتأثرة</strong><p>أي تعديل جوهري يجب أن يوضح أثره على القرارات والبنوك والأهداف.</p><Link href="/cases">فتح القرارات</Link></article>
      <article><span>المراجعة</span><strong>المراجعة والتعلم</strong><p>اربط حالات التعارض أو الأخطاء بالمراجعة المؤسسية بدل تجاهلها.</p><Link href="/reports/learning">فتح مراجعة المعرفة</Link></article>
    </section>
    <section className="namaa-governance-catalog-empty">
      <LucideIcon name="receiptText" size={24}/>
      <div><strong>لا توجد مواد مفهرسة هنا بعد</strong><p>الصفحة تعمل الآن بدون خطأ. عند ربط مصدر المواد المعتمدة ستظهر هنا كسجلات قابلة للعرض والتعديل وفق الصلاحيات.</p></div>
      <Link href="/conversations" className="namaa-wide-action-secondary">مناقشة هذا القسم</Link>
    </section>
  </main>;
}
