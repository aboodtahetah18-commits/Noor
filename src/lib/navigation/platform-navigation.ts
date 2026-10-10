import type { LucideIconName } from '@/components/ui/lucide-icon';

/** Single navigation registry used by the main platform and conversation drawer. */
export const PLATFORM_NAVIGATION: ReadonlyArray<{ href: string; label: string; icon: LucideIconName }> = [
  { href:'/dashboard', label:'الرئيسية', icon:'house' },
  { href:'/conversations', label:'مركز العمل', icon:'messageSquareText' },
  { href:'/accounts', label:'الحسابات', icon:'creditCard' },
  { href:'/transactions', label:'العمليات', icon:'repeat2' },
  { href:'/budget', label:'الميزانية', icon:'chart' },
  { href:'/bank-operations', label:'البنوك', icon:'landmark' },
  { href:'/investments', label:'الاستثمارات', icon:'chart' },
  { href:'/reports', label:'التقارير', icon:'receiptText' },
  { href:'/governance', label:'المعرفة', icon:'receiptText' },
  { href:'/cases', label:'القضايا والقرارات', icon:'listChecks' },
  { href:'/advisor', label:'مختبر الخوارزميات', icon:'sparkles' },
  { href:'/internal-funding', label:'التمويل الداخلي', icon:'banknote' },
  { href:'/workspace', label:'مركز النظام', icon:'layoutGrid' },
  { href:'/alerts', label:'التنبيهات', icon:'bell' },
  { href:'/settings', label:'الإعدادات', icon:'settings' },
];
