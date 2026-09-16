'use client';

import { BrandLogo } from './brand-logo';

export function BrandLogoSettings(){
  return <section className="p47-resource-card brand-logo-settings">
    <div className="p47-section-heading">
      <div><span>هوية المنصة</span><h2>الشعار المعتمد</h2></div>
      <small>NDOS v1.2 FINAL — مقفل</small>
    </div>
    <p className="muted">يستخدم النظام نسختي نماء الشفافتين المعتمدتين فقط: الملونة للمظهر الفاتح، والبيضاء للمظهر الداكن. لا يسمح برفع بديل محلي أو إضافة خلفية أو بطاقة حول الشعار.</p>
    <div className="brand-logo-settings-grid">
      <article className="brand-logo-setting-card is-light">
        <div className="brand-logo-preview"><BrandLogo surface="light" /></div>
        <strong>المظهر الفاتح</strong>
        <span className="muted">النسخة الملونة الشفافة المعتمدة</span>
      </article>
      <article className="brand-logo-setting-card is-dark">
        <div className="brand-logo-preview"><BrandLogo surface="dark" /></div>
        <strong>المظهر الداكن</strong>
        <span className="muted">النسخة البيضاء الشفافة المعتمدة</span>
      </article>
    </div>
  </section>;
}
