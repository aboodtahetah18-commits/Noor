import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { ACCOUNT_NAME_PRESETS } from '@/features/accounts/account-name-options';
import { BANK_OPTIONS } from '@/features/accounts/banks';
import { AccountForm } from './account-form';

export default async function NewAccountPage(){
  const user=await requireAuthenticatedUser();
  const accounts=await listAccounts(user.id,true);
  const accountNames=[...new Set([...ACCOUNT_NAME_PRESETS,...accounts.map(a=>a.name)])];
  const bankNames=[...new Set([...BANK_OPTIONS.map(b=>b.name),...accounts.map(a=>a.bankName).filter((v):v is string=>Boolean(v))])];
  return <main className="namaa-approved-finance namaa-full-form-page" dir="rtl">
    <header className="namaa-full-form-header"><div><h1>إضافة حساب</h1></div><Link href="/accounts">العودة إلى الحسابات</Link></header>
    <section className="namaa-full-form-content"><AccountForm accountNames={accountNames} bankNames={bankNames}/></section>
  </main>;
}
