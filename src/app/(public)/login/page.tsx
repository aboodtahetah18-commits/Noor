import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { safeReturnTo } from '@/auth/safe-return-to';
import { getOwnerBootstrapStatus } from '@/features/auth/queries/get-owner-bootstrap-status';
import { LoginForm } from './login-form';
import { APP_VERSION, appEnvironmentLabel } from '@/lib/app-release';
import { ThemeToggle } from '../../theme-toggle';
import { BrandLogo } from '@/components/brand/brand-logo';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);
  const user = await getAuthenticatedUser();
  if (user) redirect(returnTo);

  const bootstrapStatus = await getOwnerBootstrapStatus();
  return (
    <main className="auth-page auth-page-v42 auth-page-nature">
      <div className="auth-leaf-watermark" aria-hidden="true">
        <span className="auth-leaf-watermark-crop"><BrandLogo surface="auto" priority /></span>
      </div>
      <section className="auth-stage auth-stage-nature" aria-label="تسجيل الدخول إلى نماء">
        <aside className="auth-visual auth-visual-nature" aria-label="هوية المنصة">
          <div className="auth-nature-glow" aria-hidden="true" />
          <div className="auth-brand-lockup auth-brand-lockup-symbol">
            <span className="auth-brand-symbol-frame"><BrandLogo surface="auto" className="auth-brand-symbol" priority /></span>
            <span className="auth-mobile-badge">مستقبل مالي أكثر وعيًا</span>
            <div className="auth-nature-copy"><p className="auth-hero-eyebrow">رحلتك المالية</p><p className="auth-hero-title">رؤية أوضح لقرارات أفضل</p><p className="auth-hero-copy">تابع أموالك، خطط بهدوء، وشاهد تقدمك في مكان واحد.</p></div>
          </div>
          <div className="auth-nature-path" aria-hidden="true"><span /><span /><span /></div>
        </aside>
        <section className="auth-panel auth-panel-nature" aria-labelledby="login-title">
          <div className="auth-theme-action"><ThemeToggle /></div>
          {bootstrapStatus === 'DATABASE_NOT_READY' ? <>
            <div className="auth-heading-block"><p className="eyebrow">تهيئة البيئة</p><h2 id="login-title">جاري تجهيز بيئة التشغيل</h2></div>
            <p className="form-error auth-alert" role="alert">قاعدة البيانات لم تكتمل تهيئتها بعد. أعد نشر هذه النسخة ثم حاول مجددًا.</p>
          </> : <>
            <div className="auth-heading-block auth-heading-simple"><p className="auth-panel-kicker">مرحبًا بعودتك</p><h2 id="login-title">تسجيل الدخول</h2></div>
            <LoginForm returnTo={returnTo} />
          </>}
          <footer className="auth-version" aria-label="إصدار التطبيق"><span>{appEnvironmentLabel()}</span><b>الإصدار {APP_VERSION}</b></footer>
        </section>
      </section>
    </main>
  );
}
