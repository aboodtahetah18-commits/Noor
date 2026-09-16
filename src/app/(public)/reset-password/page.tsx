import { PasswordTokenForm } from '@/components/auth/account-access-forms';
import { PublicAuthShell } from '@/components/auth/public-auth-shell';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <PublicAuthShell kicker="استعادة الحساب" title="إنشاء كلمة مرور جديدة"><PasswordTokenForm token={token} mode="reset" /></PublicAuthShell>;
}
