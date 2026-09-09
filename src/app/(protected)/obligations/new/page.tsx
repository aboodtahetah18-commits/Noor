// p47-compatibility-redirect: legacy route preserved; canonical UX is modal-first.
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/obligations?action=add');
}
