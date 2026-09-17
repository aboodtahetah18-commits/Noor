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
          <div className={styles.brand}>
            <span className={styles.logoFrame}><BrandLogo surface="dark" className={styles.logo} priority /></span>
            <span className={styles.brandText}><strong>نماء</strong><span>مستقبل مالي أكثر وعيًا</span></span>
          </div>
          <div className={styles.visualCopy}>
            <p>منصة إدارة مالية شخصية</p>
            <h1>قرار مالي أوضح، في كل دورة.</h1>
            <small>تابع ميزانيتك، التزاماتك، أهدافك، وقراراتك من مكان واحد — دون تنفيذ أي حركة مالية نيابةً عنك.</small>
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
                <h2 id="login-title">تسجيل الدخول</h2>
                <p>أدخل بيانات حسابك للوصول إلى نماء.</p>
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
