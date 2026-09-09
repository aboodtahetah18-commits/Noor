'use client';

import { FormEvent, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';

function safeClientReturnTo(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return setError('أدخل البريد الإلكتروني وكلمة المرور.');
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/auth-owner/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) {
        const code = body.code || 'AUTH_LOGIN_FAILED';
        setError(`تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور. (${code})`);
        setPending(false); return;
      }
      window.location.assign(safeClientReturnTo(returnTo));
    } catch {
      setError('تعذر الوصول إلى مسار تسجيل الدخول. (AUTH_ROUTE_UNREACHABLE)');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form-v42" aria-label="تسجيل الدخول">
      <label><span>البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" required disabled={pending} /></label>
      <label><span>كلمة المرور</span><input name="password" type="password" autoComplete="current-password" required disabled={pending} /></label>
      {error ? <p className="form-error auth-alert" role="alert">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? 'جاري الدخول...' : 'دخول إلى مستقبلي'}</span><LucideIcon name="chevronLeft" size={20}/></button>
    </form>
  );
}
