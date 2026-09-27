import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { safeReturnTo } from '@/auth/safe-return-to';
import { getOwnerBootstrapStatus } from '@/features/auth/queries/get-owner-bootstrap-status';
import { LoginForm } from './login-form';
import { APP_VERSION, appEnvironmentLabel } from '@/lib/app-release';
import { ThemeToggle } from '../../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LucideIcon } from '@/components/ui/lucide-icon';
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
      <section className={styles.card} aria-label="تسجيل الدخول إلى نماء">
        <div className={styles.themeButton}><ThemeToggle /></div>

        <header className={styles.brandBlock}>
          <BrandLogo surface="dark" className={styles.logo} priority />
          <div className={styles.titleRow}>
            <span className={styles.lockIcon} aria-hidden="true"><LucideIcon name="lockKeyhole" size={20} /></span>
            <h1 id="login-title">تسجيل الدخول</h1>
          </div>
        </header>

        {bootstrapStatus === 'DATABASE_NOT_READY' ? (
          <div className={styles.loadingCard}>
            <strong>جاري تجهيز بيئة التشغيل</strong>
            <p>قاعدة البيانات لم تكتمل تهيئتها بعد. حاول مجددًا بعد اكتمال التجهيز.</p>
          </div>
        ) : (
          <LoginForm returnTo={returnTo} />
        )}

        <footer className={styles.footer} aria-label="إصدار التطبيق">
          <span>{appEnvironmentLabel()}</span>
          <b>الإصدار {APP_VERSION}</b>
        </footer>
      </section>
    </main>
  );
}
