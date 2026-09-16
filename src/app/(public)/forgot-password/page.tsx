import { ForgotPasswordForm } from '@/components/auth/account-access-forms';
import { PublicAuthShell } from '@/components/auth/public-auth-shell';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return <PublicAuthShell kicker="استعادة الحساب" title="نسيت كلمة المرور"><ForgotPasswordForm /></PublicAuthShell>;
}
