import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeToggle } from '@/app/(public)/theme-toggle';

export function PublicAuthShell({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return <main className="auth-page auth-page-v42 auth-page-nature">
    <section className="auth-stage auth-stage-nature" aria-label={title}>
      <aside className="auth-visual auth-visual-nature" aria-label="هوية نماء">
        <div className="auth-nature-glow" aria-hidden="true" />
        <div className="auth-brand-lockup auth-brand-lockup-symbol">
          <span className="auth-brand-symbol-frame"><BrandLogo surface="dark" className="auth-brand-symbol" priority /></span>
          <div className="auth-nature-copy"><p className="auth-hero-eyebrow">نماء</p><p className="auth-hero-title">رؤية أوضح لقرارات أفضل</p><p className="auth-hero-copy">حسابك يبدأ ببريد إلكتروني متحقق، ثم كلمة مرور خاصة بك.</p></div>
        </div>
      </aside>
      <section className="auth-panel auth-panel-nature" aria-labelledby="auth-flow-title">
        <div className="auth-theme-action"><ThemeToggle /></div>
        <div className="auth-heading-block auth-heading-simple"><p className="auth-panel-kicker">{kicker}</p><h1 id="auth-flow-title">{title}</h1></div>
        {children}
      </section>
    </section>
  </main>;
}
