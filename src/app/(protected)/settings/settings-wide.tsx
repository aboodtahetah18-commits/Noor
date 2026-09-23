import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

type SettingsWideProps = {
  displayName: string | null;
  email: string | null;
  timezone: string;
  activeAccounts: number;
  activeCategories: number;
  activeObligations: number;
  activeSessionCount: number;
  emailVerified: boolean;
};

export function SettingsWide({
  displayName,
  email,
  timezone,
  activeAccounts,
  activeCategories,
  activeObligations,
  activeSessionCount,
  emailVerified,
}: SettingsWideProps) {
  return (
    <section className="namaa-wide-only namaa-settings-wide" dir="rtl">
      <header className="namaa-settings-hero namaa-wide-card">
        <div>
          <p>مركز التحكم</p>
          <h1>الإعدادات</h1>
          <span>كل ما يمكن التحكم به في نماء من مكان واحد، مع فصل القيم الحساسة وتحليل أثرها قبل التفعيل.</span>
        </div>
        <div className="namaa-settings-hero-status">
          <LucideIcon name="settings" size={32}/>
          <span>{emailVerified ? 'الحساب موثّق' : 'البريد غير موثّق'}</span>
        </div>
      </header>

      <div className="namaa-settings-layout">
        <aside className="namaa-settings-nav namaa-wide-panel">
          <div className="namaa-investments-section-title">
            <div><p>الأقسام</p><h2>التحكم العام</h2></div>
            <LucideIcon name="slidersHorizontal" size={20}/>
          </div>
          <nav>
            <a href="#wide-identity">الهوية والحساب</a>
            <a href="#wide-financial">الثوابت المالية</a>
            <a href="#wide-operations">التشغيل والمراجع</a>
            <a href="#wide-notifications">الإشعارات</a>
            <a href="#wide-security">الأمان والصلاحيات</a>
          </nav>
        </aside>

        <section className="namaa-settings-main">
          <section id="wide-identity" className="namaa-settings-section namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>الهوية والحساب</p><h2>الملف الشخصي والهوية</h2></div>
              <LucideIcon name="circleUserRound" size={20}/>
            </div>
            <div className="namaa-settings-summary-grid">
              <article><span>الاسم</span><strong>{displayName ?? '—'}</strong></article>
              <article><span>البريد</span><strong>{email ?? '—'}</strong></article>
              <article><span>المنطقة الزمنية</span><strong>{timezone}</strong></article>
              <article><span>العملة</span><strong>ريال سعودي</strong></article>
            </div>
            <p className="namaa-settings-intro">تغيير الشعارات وصور الشخصيات والهوية البصرية يبقى من الإعدادات، وليس من صفحات البنوك أو المحادثات.</p>
          </section>

          <section id="wide-financial" className="namaa-settings-section namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>الثوابت المالية</p><h2>النسب والحدود والمبالغ المرجعية</h2></div>
              <LucideIcon name="badgeDollarSign" size={20}/>
            </div>
            <div className="namaa-settings-control-grid">
              <Link href="/settings/financial-buffer"><strong>الاحتياطي المالي</strong><span>حدود الحماية والمتاح الآمن للصرف</span></Link>
              <Link href="/internal-funding"><strong>التمويل الداخلي</strong><span>نسب التمويل والقواعد المرتبطة به</span></Link>
              <Link href="/budget-categories"><strong>بنود الميزانية</strong><span>{activeCategories} بند نشط</span></Link>
              <Link href="/obligations"><strong>الالتزامات</strong><span>{activeObligations} التزام نشط</span></Link>
            </div>
            <div className="namaa-settings-impact-note">
              <LucideIcon name="triangleAlert" size={20}/>
              <div>
                <strong>قاعدة التغيير الحساس</strong>
                <p>الضرائب وحدود المخاطر وقواعد الحماية والنسب المؤثرة تمر بتحليل أثر ثم اختبار ومحاكاة قبل الاعتماد والتفعيل، مع إمكانية الرجوع للإصدار السابق.</p>
              </div>
            </div>
          </section>

          <section id="wide-operations" className="namaa-settings-section namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>التشغيل والمراجع</p><h2>مصادر النظام وإعداداته التشغيلية</h2></div>
              <LucideIcon name="layoutGrid" size={20}/>
            </div>
            <div className="namaa-settings-control-grid">
              <Link href="/accounts"><strong>الحسابات</strong><span>{activeAccounts} حساب نشط</span></Link>
              <Link href="/bank-statements"><strong>كشوف الحساب</strong><span>الاستيراد والمطابقة</span></Link>
              <Link href="/merchants"><strong>التجار والأسماء البديلة</strong><span>مرجع التصنيف والتطابق</span></Link>
              <Link href="/decision-log"><strong>سجل القرارات</strong><span>التغييرات والاعتمادات</span></Link>
              <Link href="/governance"><strong>المعرفة</strong><span>السياسات واللوائح والإجراءات والصلاحيات</span></Link>
              <Link href="/advisor"><strong>مختبر الخوارزميات</strong><span>الاختبار والتصحيح والنسخ</span></Link>
            </div>
          </section>

          <section id="wide-notifications" className="namaa-settings-section namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>الإشعارات</p><h2>القنوات والأولوية</h2></div>
              <LucideIcon name="bell" size={20}/>
            </div>
            <div className="namaa-settings-control-grid">
              <Link href="/alerts"><strong>داخل المنصة</strong><span>الحرجة تبقى حتى المعالجة</span></Link>
              <Link href="/alerts"><strong>إشعارات المتصفح</strong><span>للحالات المهمة والعاجلة</span></Link>
              <Link href="/alerts"><strong>البريد الإلكتروني</strong><span>للتنبيهات والملخصات</span></Link>
              <Link href="/alerts"><strong>الملخص اليومي</strong><span>تجميع الإشعارات العادية</span></Link>
            </div>
          </section>

          <section id="wide-security" className="namaa-settings-section namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div><p>الأمان والصلاحيات</p><h2>الحساب والجلسات</h2></div>
              <LucideIcon name="lockKeyhole" size={20}/>
            </div>
            <div className="namaa-settings-summary-grid">
              <article><span>الجلسات النشطة</span><strong>{activeSessionCount}</strong></article>
              <article><span>حالة البريد</span><strong>{emailVerified ? 'موثّق' : 'غير موثّق'}</strong></article>
            </div>
            <p className="namaa-settings-intro">الإجراءات الأمنية الفعلية تبقى في أدوات الإعدادات الحالية أسفل هذه الواجهة حتى لا ننشئ حفظًا أو صلاحيات وهمية.</p>
          </section>
        </section>
      </div>
    </section>
  );
}
