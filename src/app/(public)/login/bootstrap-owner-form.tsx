'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LucideIcon } from '@/components/ui/lucide-icon';

type ApiBody = { code?: string; detail?: string };

const messages: Record<string, string> = {
  AUTH_HTTP_DB_FAILED: 'تعذر الوصول إلى قاعدة البيانات عبر Neon HTTP.',
  AUTH_HTTP_SCHEMA_FAILED: 'بنية جداول المصادقة غير مكتملة.',
  AUTH_OWNER_EXISTS: 'يوجد حساب مالك بالفعل. استخدم تسجيل الدخول.',
  AUTH_OWNER_CREATE_FAILED: 'تعذر إنشاء حساب المالك داخل قاعدة البيانات.',
  AUTH_INPUT_INVALID: 'تحقق من الاسم والبريد وكلمة المرور.',
};

export function BootstrapOwnerForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<'checking' | 'ok' | 'failed'>('checking');

  useEffect(() => {
    fetch('/api/auth-owner/health', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as ApiBody;
        if (!response.ok || body.code !== 'AUTH_HTTP_OK') throw new Error(body.code || 'AUTH_HTTP_DB_FAILED');
        setHealth('ok');
      })
      .catch(() => setHealth('failed'));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || health !== 'ok') return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirm_password') ?? '');
    if (name.length < 2) return setError('أدخل اسمًا صحيحًا.');
    if (!email.includes('@')) return setError('أدخل بريدًا إلكترونيًا صحيحًا.');
    if (password.length < 12) return setError('كلمة المرور يجب ألا تقل عن 12 حرفًا.');
    if (password !== confirmPassword) return setError('تأكيد كلمة المرور غير مطابق.');

    setPending(true); setError(null);
    try {
      const response = await fetch('/api/auth-owner/register', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await response.json().catch(() => ({})) as ApiBody;
      if (!response.ok) {
        const code = body.code || 'AUTH_HTTP_UNKNOWN';
        setError(`${messages[code] || 'تعذر إنشاء حساب المالك.'} (${code})`);
        setPending(false); return;
      }
      router.replace('/onboarding');
      router.refresh();
    } catch {
      setError('تعذر الوصول إلى مسار إنشاء الحساب. (AUTH_ROUTE_UNREACHABLE)');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form-v42" aria-label="إنشاء حساب المالك">
      <p className={health === 'ok' ? 'auth-success' : health === 'failed' ? 'form-error auth-alert' : 'auth-recovery-note'} role="status">
        {health === 'ok' ? 'اتصال Neon HTTP جاهز لإنشاء الحساب.' : health === 'failed' ? 'فشل فحص اتصال المصادقة عبر Neon HTTP.' : 'جاري فحص اتصال المصادقة...'}
      </p>
      <label><span>الاسم</span><input name="name" type="text" autoComplete="name" minLength={2} placeholder="مثال: عبدالله" required disabled={pending} /></label>
      <label><span>البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required disabled={pending} /></label>
      <label><span>كلمة المرور</span><input name="password" type="password" autoComplete="new-password" minLength={12} placeholder="12 حرفًا على الأقل" required disabled={pending} /></label>
      <label><span>تأكيد كلمة المرور</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={12} placeholder="أعد كتابة كلمة المرور" required disabled={pending} /></label>
      <p className="auth-password-hint">استخدم كلمة مرور طويلة وفريدة لا تستعملها في أي خدمة أخرى.</p>
      {error ? <p className="form-error auth-alert" role="alert">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending || health !== 'ok'}>
        <span>{pending ? 'جاري إنشاء الحساب...' : 'إنشاء حساب المالك'}</span><LucideIcon name="chevronLeft" size={20}/>
      </button>
    </form>
  );
}
