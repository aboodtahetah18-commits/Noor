import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { safeReturnTo } from '@/auth/safe-return-to';
import { getOwnerBootstrapStatus } from '@/features/auth/queries/get-owner-bootstrap-status';
import { LoginForm } from './login-form';
import { BootstrapOwnerForm } from './bootstrap-owner-form';
import { APP_VERSION, appEnvironmentLabel } from '@/lib/app-release';
import { ThemeToggle } from '../../theme-toggle';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; created?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);
  const user = await getAuthenticatedUser();
  if (user) redirect(returnTo);

  const bootstrapStatus = await getOwnerBootstrapStatus();
  const isBootstrap = bootstrapStatus === 'READY_TO_CREATE';

  return (
    <main className="auth-page auth-page-v42">
      <section className="auth-stage" aria-label="مستقبلي">
        <aside className="auth-visual" aria-label="هوية مستقبلي">
          <div className="auth-brand-lockup">
            <Image
              className="auth-brand-logo auth-brand-logo-dark-surface"
              src="/brand/mustaqbali-logo-white.png"
              width={265}
              height={95}
              alt="مستقبلي"
              priority
            />
            <h1>مستقبلي</h1>
            <p className="auth-kicker">إدارة أذكى لحياتك المالية</p>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-theme-action"><ThemeToggle /></div>
{isBootstrap ? (
            <>
              <div className="auth-heading-block auth-heading-simple">
                <h2 id="login-title">إنشاء حساب المالك</h2>
              </div>
              <BootstrapOwnerForm />
            </>
          ) : bootstrapStatus === 'DATABASE_NOT_READY' ? (
            <>
              <div className="auth-heading-block">
                <p className="eyebrow">تهيئة البيئة</p>
                <h2 id="login-title">جاري تجهيز بيئة التشغيل</h2>
              </div>
              <p className="form-error auth-alert" role="alert">
                قاعدة البيانات لم تكتمل تهيئتها بعد. أعد نشر هذه النسخة؛ سيتم تطبيق تحديثات قاعدة البيانات المطلوبة تلقائيًا.
              </p>
            </>
          ) : (
            <>
              <div className="auth-heading-block auth-heading-simple">
                <h2 id="login-title">تسجيل الدخول</h2>
              </div>
              {params.created === '1' ? (
                <p className="auth-success" role="status">تم إنشاء حساب المالك. سجّل الدخول لإكمال الإعداد.</p>
              ) : null}
              <LoginForm returnTo={returnTo} />
            </>
          )}

          <footer className="auth-version" aria-label="إصدار التطبيق">
            <span>{appEnvironmentLabel()}</span>
            <b>الإصدار {APP_VERSION}</b>
          </footer>
        </section>
      </section>
    </main>
  );
}
