'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';

function safeClientReturnTo(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

function loginErrorMessage(code: string): string {
  if (code === 'AUTH_ORIGIN_REJECTED') return 'تعذر التحقق من نطاق تسجيل الدخول. أعد تحميل الصفحة وحاول مرة أخرى.';
  if (code === 'AUTH_RATE_LIMITED') return 'تمت محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.';
  if (code === 'AUTH_INPUT_INVALID') return 'تحقق من البريد الإلكتروني وكلمة المرور.';
  if (code === 'EMAIL_NOT_VERIFIED') return 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.';
  if (code === 'PASSWORD_NOT_SET') return 'تم تأكيد البريد ولكن كلمة المرور لم تُنشأ بعد. افتح رابط التحقق الأخير من بريدك.';
  return 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.';
}

export function LoginForm({ returnTo, previewOnly = false }: { returnTo: string; previewOnly?: boolean }) {
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewOnly) {
      setError('هذه معاينة للواجهة فقط. تسجيل الدخول الفعلي غير مفعّل في بيئة المعاينة.');
      return;
    }
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return setError('أدخل البريد الإلكتروني وكلمة المرور.');
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) {
        setError(loginErrorMessage(body.code || 'AUTH_LOGIN_FAILED'));
        setPending(false);
        return;
      }
      window.location.assign(safeClientReturnTo(returnTo));
    } catch {
      setError('تعذر الوصول إلى مسار تسجيل الدخول.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form-v42 auth-form-nature" aria-label="تسجيل الدخول">
      <label className="auth-input-field"><span>البريد الإلكتروني</span><span className="auth-input-shell"><LucideIcon name="circleUserRound" size={20} /><input name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} placeholder="name@example.com" /></span></label>
      <label className="auth-input-field"><span>كلمة المرور</span><span className="auth-input-shell"><LucideIcon name="lockKeyhole" size={20} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={pending} /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}><LucideIcon name={showPassword ? 'eyeOff' : 'eye'} size={20} /></button></span></label>
      <p className="auth-helper"><Link href="/forgot-password">نسيت كلمة المرور؟</Link></p>
      {error ? <p className="form-error auth-alert" role="alert">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? 'جاري الدخول...' : 'دخول إلى نماء'}</span><LucideIcon name="chevronLeft" size={20}/></button>
      <p className="auth-helper">ليس لديك حساب؟ <Link href="/register">إنشاء حساب جديد</Link></p>
    </form>
  );
}
