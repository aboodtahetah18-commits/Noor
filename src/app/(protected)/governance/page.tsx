import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { CENTRAL_ACTIVE_POLICIES } from '@/content/governance/central-active-policies';
import { CENTRAL_ACTIVE_REGULATIONS } from '@/content/governance/central-active-regulations';
import { CENTRAL_ACTIVE_PROCEDURES } from '@/content/governance/central-active-procedures';

const preview=(items:readonly {referenceCode:string;title:string;version:string|null}[])=>items.slice(0,3);

export default function GovernancePage(){
  const total=CENTRAL_ACTIVE_POLICIES.length+CENTRAL_ACTIVE_REGULATIONS.length+CENTRAL_ACTIVE_PROCEDURES.length;
  return <main className="namaa-governance-portal page-shell" dir="rtl">
    <header className="namaa-governance-portal-hero">
      <div>
        <span>المرجع المؤسسي</span>
        <h1>مكتبة المعرفة والحوكمة</h1>
        <p>الوصول المباشر إلى السياسات واللوائح والإجراءات النافذة، مع فصل واضح بين القراءة وإدارة الصلاحيات.</p>
      </div>
      <div className="namaa-governance-portal-total">
        <strong>{total}</strong>
        <span>وثيقة متاحة للاطلاع</span>
      </div>
    </header>

    <section className="namaa-governance-portal-metrics" aria-label="ملخص مكتبة المعرفة">
      <article className="tone-policy"><span>السياسات</span><strong>{CENTRAL_ACTIVE_POLICIES.length}</strong><small>وثائق السياسة المركزية</small></article>
      <article className="tone-regulation"><span>اللوائح</span><strong>{CENTRAL_ACTIVE_REGULATIONS.length}</strong><small>لوائح التشغيل والرقابة</small></article>
      <article className="tone-procedure"><span>الإجراءات</span><strong>{CENTRAL_ACTIVE_PROCEDURES.length}</strong><small>حزم الإجراءات التشغيلية</small></article>
      <article className="tone-auth"><span>الصلاحيات</span><strong>محكومة</strong><small>القراءة منفصلة عن الإدارة</small></article>
    </section>

    <section className="namaa-governance-portal-grid">
      <article className="namaa-governance-library-card card-policy">
        <header><div><span>المكتبة الأولى</span><h2>السياسات</h2></div><LucideIcon name="receiptText" size={24}/></header>
        <p>السياسات الحاكمة للقرار والتشغيل والصلاحيات والمتابعة.</p>
        <div className="namaa-governance-doc-preview">
          {preview(CENTRAL_ACTIVE_POLICIES).map(item=><Link key={item.referenceCode} href={'/governance/policies?ref='+encodeURIComponent(item.referenceCode)}>
            <strong>{item.title}</strong><small>{item.referenceCode} · {item.version??'المعتمد'}</small>
          </Link>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/policies">فتح مكتبة السياسات</Link>
      </article>

      <article className="namaa-governance-library-card card-regulation">
        <header><div><span>المكتبة الثانية</span><h2>اللوائح</h2></div><LucideIcon name="receiptText" size={24}/></header>
        <p>اللوائح التنظيمية التي تفصل التطبيق والرقابة وسجل الأثر.</p>
        <div className="namaa-governance-doc-preview">
          {preview(CENTRAL_ACTIVE_REGULATIONS).map(item=><Link key={item.referenceCode} href={'/governance/regulations?ref='+encodeURIComponent(item.referenceCode)}>
            <strong>{item.title}</strong><small>{item.referenceCode} · {item.version??'المعتمد'}</small>
          </Link>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/regulations">فتح مكتبة اللوائح</Link>
      </article>

      <article className="namaa-governance-library-card card-procedure">
        <header><div><span>المكتبة الثالثة</span><h2>الإجراءات</h2></div><LucideIcon name="listChecks" size={24}/></header>
        <p>المسارات التنفيذية التي تحدد كيف تنتقل الحالة من التحليل إلى المتابعة.</p>
        <div className="namaa-governance-doc-preview">
          {preview(CENTRAL_ACTIVE_PROCEDURES).map(item=><Link key={item.referenceCode} href={'/governance/procedures?ref='+encodeURIComponent(item.referenceCode)}>
            <strong>{item.title}</strong><small>{item.referenceCode} · {item.version??'المعتمد'}</small>
          </Link>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/procedures">فتح مكتبة الإجراءات</Link>
      </article>

      <article className="namaa-governance-library-card card-auth">
        <header><div><span>الصلاحيات والاعتماد</span><h2>مصفوفة الصلاحيات</h2></div><LucideIcon name="lockKeyhole" size={24}/></header>
        <p>للاطلاع العام استخدم سياسة الصلاحيات والتفويض والتصعيد. أما شاشة الإدارة فهي مقيدة بالمستخدمين المخولين فقط.</p>
        <div className="namaa-governance-auth-actions">
          <Link href="/governance/policies?ref=NMC-POL-02">قراءة سياسة الصلاحيات</Link>
          <Link href="/governance/authorization">فتح إدارة الصلاحيات</Link>
        </div>
        <small className="namaa-governance-auth-note">إذا لم تكن لديك صلاحية الإدارة فلن تفتح وحدة التحكم الإدارية، لكن وثيقة السياسة ستظل متاحة للاطلاع.</small>
      </article>
    </section>

    <section className="namaa-governance-portal-footer">
      <div><strong>الوثائق للقراءة أولًا</strong><span>هذه الصفحة ليست لوحة تحكم ولا صفحة إعدادات؛ هي بوابة الوصول إلى المرجع المؤسسي المعتمد.</span></div>
      <Link href="/conversations">مناقشة وثيقة مع الجهة المختصة</Link>
    </section>
  </main>;
}
