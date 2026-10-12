import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { LucideIcon } from '@/components/ui/lucide-icon';

const banks=[
 {key:'central',name:'بنك نماء المركزي',description:'الحوكمة والاستقرار والرقابة',icon:'landmark' as const,tone:'central'},
 {key:'hilal',name:'بنك الهلال',description:'التمويل الداخلي والالتزامات',icon:'repeat2' as const,tone:'hilal'},
 {key:'solvency',name:'بنك ملاءة',description:'الحماية والاحتياطي والسيولة',icon:'lockKeyhole' as const,tone:'solvency'},
 {key:'assets',name:'بنك الأصول الاستثمارية',description:'الأصول والاستثمارات والأهداف',icon:'chart' as const,tone:'assets'},
] as const;

export default async function BankOperationsPage(){
 await requireAuthenticatedUser();
 return <main className="p47-page namaa-banks-unified-page namaa-approved-finance namaa-system-banks namaa-v2 namaa-v2-banks" dir="rtl">
  <p className="namaa-v2-banks__intro">اختر البنك للانتقال إلى صفحته المستقلة</p>
  <nav className="namaa-system-bank-grid" aria-label="بنوك نماء">
   {banks.map(bank=><Link href={`/bank-operations/${bank.key}`} key={bank.key} className={`namaa-system-bank-tile tone-${bank.tone}`}>
    <span className="namaa-system-bank-symbol"><LucideIcon name={bank.icon} size={20}/></span>
    <strong>{bank.name}</strong><small>{bank.description}</small>
   </Link>)}
  </nav>
 </main>;
}
