import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { safeReturnTo } from '@/auth/safe-return-to';
import { getOwnerBootstrapStatus } from '@/features/auth/queries/get-owner-bootstrap-status';
import { LoginForm } from './login-form';
import { APP_VERSION, appEnvironmentLabel } from '@/lib/app-release';
import { ThemeToggle } from '../../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';
import styles from './login.module.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);
  const user = await getAuthenticatedUser();
  if (user) redirect(returnTo);

  const bootstrapStatus = await getOwnerBootstrapStatus();

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="تسجيل الدخول إلى نماء">
        <aside className={styles.visual} aria-label="هوية نماء">
          <div className={styles.leafDecorOne} aria-hidden="true" />
          <div className={styles.leafDecorTwo} aria-hidden="true" />
          <div className={styles.heroTheme}><ThemeToggle /></div>

          <div className={styles.brand}>
            <span className={styles.logoFrame} aria-label="نماء"><BrandLogo surface="light" className={`${styles.logo} ${styles.logoLight}`} priority /><BrandLogo surface="dark" className={`${styles.logo} ${styles.logoDark}`} priority /></span>
            <span className={styles.brandText}><strong>نماء</strong><span>مستقبل مالي أكثر وعيًا</span></span>
          </div>

          <div className={styles.mobileHeroCopy}>
            <span className={styles.mobileBadge}>ابدأ بوعي مالي</span>
            <h1>مرحبًا بعودتك</h1>
            <p>أدخل بيانات حسابك للوصول إلى نماء.</p>
          </div>

          <div className={styles.visualCopy}>
            <span className={styles.identityBadge}>منصة إدارة مالية شخصية</span>
            <h1>قرار مالي أوضح،<br/>ضمن تجربة واحدة.</h1>
            <p>تابع الميزانية، الالتزامات، الأهداف والقرارات من مكان واحد، مع بقاء التنفيذ المالي بيدك.</p>
            <div className={styles.featureStrip} aria-label="مزايا نماء">
              <span><b>01</b> رؤية مالية موحدة</span>
              <span><b>02</b> قرارات قابلة للتتبع</span>
              <span><b>03</b> متابعة دون تنفيذ تلقائي</span>
            </div>
          </div>
        </aside>

        <section className={styles.panel} aria-labelledby="login-title">
          <div className={styles.themeButton}><ThemeToggle /></div>

          {bootstrapStatus === 'DATABASE_NOT_READY' ? (
            <div className={styles.loadingCard}>
              <p className={styles.kicker}>تهيئة البيئة</p>
              <h2 id="login-title">جاري تجهيز بيئة التشغيل</h2>
              <p>قاعدة البيانات لم تكتمل تهيئتها بعد. أعد نشر هذه النسخة ثم حاول مجددًا.</p>
            </div>
          ) : (
            <>
              <div className={styles.heading}>
                <p className={styles.kicker}>مرحبًا بعودتك</p>
                <h2 id="login-title">تسجيل الدخول إلى نماء</h2>
                <p>استخدم بريدك الإلكتروني وكلمة المرور للمتابعة إلى مساحة العمل.</p>
              </div>
              <LoginForm returnTo={returnTo} />
            </>
          )}

          <footer className={styles.footer} aria-label="إصدار التطبيق">
            <span>{appEnvironmentLabel()}</span>
            <b>الإصدار {APP_VERSION}</b>
          </footer>
        </section>
      </section>
    </main>
  );
}
