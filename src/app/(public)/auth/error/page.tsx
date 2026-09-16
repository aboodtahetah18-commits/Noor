import Link from 'next/link';
import { PublicAuthShell } from '@/components/auth/public-auth-shell';

export const dynamic = 'force-dynamic';

const messages: Record<string, { title: string; body: string; href: string; action: string }> = {
  AUTH_TOKEN_INVALID_OR_EXPIRED: {
    title: 'الرابط غير صالح أو انتهت صلاحيته',
    body: 'اطلب رابطًا جديدًا ثم استخدم أحدث رسالة وصلتك من نماء.',
    href: '/register',
    action: 'طلب رابط تحقق جديد',
  },
  AUTH_RATE_LIMITED: {
    title: 'تمت محاولات كثيرة خلال وقت قصير',
    body: 'حاول مرة أخرى لاحقًا باستخدام أحدث رابط في بريدك.',
    href: '/login',
    action: 'العودة إلى تسجيل الدخول',
  },
  AUTH_VERIFICATION_FAILED: {
    title: 'تعذر إكمال التحقق',
    body: 'لم يتم تغيير حالة حسابك. اطلب رابط تحقق جديد وحاول مرة أخرى.',
    href: '/register',
    action: 'طلب رابط تحقق جديد',
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = '' } = await searchParams;
  const state = messages[code] ?? {
    title: 'تعذر إكمال طلب المصادقة',
    body: 'الطلب غير صالح. ابدأ من صفحة تسجيل الدخول أو اطلب رابطًا جديدًا.',
    href: '/login',
    action: 'العودة إلى تسجيل الدخول',
  };
  return <PublicAuthShell kicker="أمان الحساب" title={state.title}>
    <div className="auth-success" role="alert"><p>{state.body}</p><Link href={state.href}>{state.action}</Link></div>
  </PublicAuthShell>;
}
