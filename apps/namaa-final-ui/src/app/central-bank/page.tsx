import { AppShell } from '@/components/AppShell';
import { BankWorkspace } from '@/components/BankWorkspace';
import { requireUser } from '@/lib/auth/require-user';
import { getCentralBankSnapshot } from '@/lib/db/repositories';
export default async function Page(){const user=await requireUser();const data=await getCentralBankSnapshot(user.id);return <AppShell userName={user.name}><BankWorkspace kind="central" data={data}/></AppShell>}
