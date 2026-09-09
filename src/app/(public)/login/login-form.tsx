'use client';

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
  return `تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور. (${code})`;
}

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return setError('أدخل البريد الإلكتروني وكلمة المرور.');
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth-owner/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) {
        const code = body.code || 'AUTH_LOGIN_FAILED';
        setError(loginErrorMessage(code));
        setPending(false);
        return;
      }
      window.location.assign(safeClientReturnTo(returnTo));
    } catch {
      setError('تعذر الوصول إلى مسار تسجيل الدخول. (AUTH_ROUTE_UNREACHABLE)');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form-v42 auth-form-nature" aria-label="تسجيل الدخول">
      <label className="auth-input-field">
        <span>البريد الإلكتروني</span>
        <span className="auth-input-shell">
          <LucideIcon name="circleUserRound" size={20} />
          <input name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} placeholder="name@example.com" />
        </span>
      </label>
      <label className="auth-input-field">
        <span>كلمة المرور</span>
        <span className="auth-input-shell">
          <LucideIcon name="lockKeyhole" size={20} />
          <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={pending} />
          <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
            <LucideIcon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
          </button>
        </span>
      </label>
      {error ? <p className="form-error auth-alert" role="alert">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending}>
        <span>{pending ? 'جاري الدخول...' : 'دخول إلى مستقبلي'}</span>
        <LucideIcon name="chevronLeft" size={20}/>
      </button>
    </form>
  );
}
