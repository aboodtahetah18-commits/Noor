import { PasswordTokenForm } from '@/components/auth/account-access-forms';
import { PublicAuthShell } from '@/components/auth/public-auth-shell';

export const dynamic = 'force-dynamic';

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <PublicAuthShell kicker="تم التحقق من البريد" title="إنشاء كلمة المرور"><PasswordTokenForm token={token} mode="setup" /></PublicAuthShell>;
}
