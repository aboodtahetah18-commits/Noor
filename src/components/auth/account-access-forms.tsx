'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';
import styles from './public-auth-shell.module.css';

function messageFor(code: string): string {
  if (code === 'AUTH_RATE_LIMITED') return 'تمت محاولات كثيرة خلال وقت قصير. حاول لاحقًا.';
  if (code === 'AUTH_EMAIL_NOT_CONFIGURED') return 'خدمة البريد لم تُهيأ بعد. تواصل مع مسؤول المنصة.';
  if (code === 'AUTH_PILOT_ACCESS_REQUIRED') return 'هذا البريد غير مضاف إلى قائمة التجربة الحالية.';
  if (code === 'AUTH_UNTRUSTED_ORIGIN') return 'تم رفض الطلب بسبب عنوان غير موثوق. حدّث الصفحة وحاول مرة أخرى.';
  if (code === 'AUTH_PASSWORD_WEAK') return 'استخدم كلمة مرور من 10 أحرف على الأقل وتتضمن حرفًا ورقمًا.';
  if (code === 'AUTH_TOKEN_INVALID_OR_EXPIRED') return 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.';
  if (code === 'AUTH_INPUT_INVALID') return 'تحقق من البيانات المدخلة.';
  return 'تعذر إكمال الطلب الآن. حاول مرة أخرى.';
}

function fieldClass(ltr = false) {
  return ltr ? `${styles.input} ${styles.ltr}` : styles.input;
}

function FieldIcon({ name }: { name: LucideIconName }) {
  return <span className={styles.inputIcon} aria-hidden="true"><LucideIcon name={name} size={20} /></span>;
}

export function RegisterForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      firstName: String(data.get('firstName') ?? '').trim(),
      lastName: String(data.get('lastName') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim().toLowerCase(),
      city: String(data.get('city') ?? '').trim(),
    };
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/account/register', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) setError(messageFor(body.code ?? 'AUTH_REGISTER_FAILED')); else setSent(true);
    } catch { setError('تعذر الاتصال بالخادم. حاول مرة أخرى.'); }
    finally { setPending(false); }
  }

  if (sent) return <div className={styles.success} role="status"><strong>تحقق من بريدك الإلكتروني</strong><p>إذا كان البريد متاحًا للتسجيل فستصلك رسالة من نماء. افتح الرابط لتأكيد البريد ثم أنشئ كلمة المرور.</p><Link href="/login">العودة إلى تسجيل الدخول</Link></div>;

  return <form className={styles.form} onSubmit={submit}>
    <label className={styles.field}><span className={styles.fieldLabel}>الاسم</span><span className={styles.inputShell}><input className={styles.input} name="firstName" autoComplete="given-name" required maxLength={60} disabled={pending} /><FieldIcon name="circleUserRound" /></span></label>
    <label className={styles.field}><span className={styles.fieldLabel}>اسم العائلة</span><span className={styles.inputShell}><input className={styles.input} name="lastName" autoComplete="family-name" required maxLength={60} disabled={pending} /><FieldIcon name="circleUserRound" /></span></label>
    <label className={styles.field}><span className={styles.fieldLabel}>رقم الجوال</span><span className={styles.inputShell}><input className={fieldClass(true)} name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={20} disabled={pending} placeholder="05xxxxxxxx" /><FieldIcon name="messageSquareText" /></span></label>
    <label className={styles.field}><span className={styles.fieldLabel}>البريد الإلكتروني</span><span className={styles.inputShell}><input className={fieldClass(true)} name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} placeholder="name@example.com" /><FieldIcon name="messageSquareText" /></span></label>
    <label className={styles.field}><span className={styles.fieldLabel}>المدينة</span><span className={styles.inputShell}><input className={styles.input} name="city" autoComplete="address-level2" required maxLength={100} disabled={pending} /><FieldIcon name="landmark" /></span></label>
    {error ? <p className={styles.alert} role="alert">{error}</p> : null}
    <button className={styles.submit} type="submit" disabled={pending}>{pending ? 'جاري الإرسال...' : 'إنشاء الحساب والتحقق من البريد'}</button>
    <p className={styles.helper}>لن تُنشأ كلمة المرور قبل تأكيد البريد الإلكتروني.</p>
    <p className={styles.helper}><Link href="/login">لديك حساب؟ تسجيل الدخول</Link></p>
  </form>;
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim().toLowerCase();
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/account/forgot-password', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) setError(messageFor(body.code ?? 'AUTH_RESET_REQUEST_FAILED')); else setSent(true);
    } catch { setError('تعذر الاتصال بالخادم. حاول مرة أخرى.'); }
    finally { setPending(false); }
  }
  if (sent) return <div className={styles.success} role="status"><strong>تم استلام الطلب</strong><p>إذا كان البريد مرتبطًا بحساب متحقق فستصلك رسالة لإعادة تعيين كلمة المرور.</p><Link href="/login">العودة إلى تسجيل الدخول</Link></div>;
  return <form className={styles.form} onSubmit={submit}>
    <label className={styles.field}><span className={styles.fieldLabel}>البريد الإلكتروني</span><span className={styles.inputShell}><input className={fieldClass(true)} name="email" type="email" autoComplete="email" required disabled={pending} placeholder="name@example.com" /><FieldIcon name="messageSquareText" /></span></label>
    {error ? <p className={styles.alert} role="alert">{error}</p> : null}
    <button className={styles.submit} type="submit" disabled={pending}>{pending ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}</button>
    <p className={styles.helper}><Link href="/login">العودة إلى تسجيل الدخول</Link></p>
  </form>;
}

export function PasswordTokenForm({ token, mode }: { token: string; mode: 'setup' | 'reset' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const data = new FormData(event.currentTarget); const password = String(data.get('password') ?? ''); const confirm = String(data.get('confirm') ?? '');
    if (password !== confirm) return setError('كلمتا المرور غير متطابقتين.');
    setPending(true); setError(null);
    try {
      const endpoint = mode === 'setup' ? '/api/account/set-password' : '/api/account/reset-password';
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) setError(messageFor(body.code ?? 'AUTH_PASSWORD_FAILED')); else setDone(true);
    } catch { setError('تعذر الاتصال بالخادم. حاول مرة أخرى.'); }
    finally { setPending(false); }
  }
  if (!token) return <p className={styles.alert} role="alert">الرابط غير مكتمل. اطلب رابطًا جديدًا.</p>;
  if (done) return <div className={styles.success} role="status"><strong>{mode === 'setup' ? 'تم إنشاء كلمة المرور' : 'تم تحديث كلمة المرور'}</strong><p>اكتملت العملية ويمكنك الآن تسجيل الدخول إلى نماء.</p><Link href="/login">الانتقال إلى تسجيل الدخول</Link></div>;
  return <form className={styles.form} onSubmit={submit}>
    <p className={styles.helper}>استخدم 10 أحرف على الأقل، مع حرف واحد ورقم واحد على الأقل.</p>
    <label className={styles.field}><span className={styles.fieldLabel}>كلمة المرور الجديدة</span><span className={styles.inputShell}><input className={styles.input} name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required disabled={pending} /><FieldIcon name="lockKeyhole" /></span></label>
    <label className={styles.field}><span className={styles.fieldLabel}>تأكيد كلمة المرور الجديدة</span><span className={styles.inputShell}><input className={styles.input} name="confirm" type="password" autoComplete="new-password" minLength={10} maxLength={128} required disabled={pending} /><FieldIcon name="lockKeyhole" /></span></label>
    {error ? <p className={styles.alert} role="alert">{error}</p> : null}
    <button className={styles.submit} type="submit" disabled={pending}>{pending ? 'جاري الحفظ...' : mode === 'setup' ? 'إنشاء كلمة المرور' : 'تأكيد كلمة المرور الجديدة'}</button>
  </form>;
}
