import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeToggle } from '@/app/theme-toggle';
import { APP_VERSION, appEnvironmentLabel } from '@/lib/app-release';
import styles from './public-auth-shell.module.css';

export function PublicAuthShell({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label={title}>
        <aside className={styles.visual} aria-label="هوية نماء">
          <div className={styles.brand}>
            <span className={styles.logoFrame}><BrandLogo surface="auto" className={styles.logo} priority /></span>
            <span className={styles.brandText}><strong>نماء</strong><span>مستقبل مالي أكثر وعيًا</span></span>
          </div>
          <div className={styles.visualCopy}>
            <p>منصة إدارة مالية شخصية</p>
            <h2>ابدأ حسابك بخطوات واضحة.</h2>
            <small>من التحقق بالبريد إلى إنشاء كلمة المرور، تبقى بياناتك وخطوات حسابك ضمن مسار واحد واضح وآمن.</small>
          </div>
        </aside>

        <div className={styles.mobileHero} aria-label="هوية نماء">
          <div className={styles.mobileHeroTop}>
            <span className={styles.mobileHeroLogoWrap} aria-label="نماء"><BrandLogo surface="light" className={`${styles.mobileHeroLogo} ${styles.mobileHeroLogoLight}`} priority /><BrandLogo surface="dark" className={`${styles.mobileHeroLogo} ${styles.mobileHeroLogoDark}`} priority /></span>
            <div className={styles.mobileHeroTheme}><ThemeToggle /></div>
          </div>
          <span className={styles.mobileBadge}>ابدأ بوعي مالي</span>
          <p className={styles.mobileKicker}>{kicker}</p>
          <h1>{title}</h1>
          <p className={styles.mobileSubtitle}>أكمل البيانات المطلوبة للمتابعة بأمان.</p>
        </div>

        <section className={styles.panel} aria-labelledby="auth-flow-title">
          <div className={styles.themeButton}><ThemeToggle /></div>
          <div className={styles.heading}>
            <p className={styles.kicker}>{kicker}</p>
            <h1 id="auth-flow-title">{title}</h1>
            <p>أكمل البيانات المطلوبة للمتابعة بأمان.</p>
          </div>

          {children}

          <footer className={styles.footer} aria-label="إصدار التطبيق">
            <span>{appEnvironmentLabel()}</span>
            <b>الإصدار {APP_VERSION}</b>
          </footer>
        </section>
      </section>
    </main>
  );
}
