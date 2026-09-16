import { RegisterForm } from '@/components/auth/account-access-forms';
import { PublicAuthShell } from '@/components/auth/public-auth-shell';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return <PublicAuthShell kicker="حساب جديد" title="إنشاء حساب نماء"><RegisterForm /></PublicAuthShell>;
}
