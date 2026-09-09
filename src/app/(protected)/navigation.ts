export const primaryNavigationItems = [
  { href: '/dashboard', label: 'الرئيسية' },
  { href: '/transactions', label: 'السجل المالي' },
  { href: '/bank-operations', label: 'البنوك' },
  { href: '/merchants', label: 'التجار' },
  { href: '/budget', label: 'الميزانية' },
  { href: '/obligations', label: 'الالتزامات' },
  { href: '/goals', label: 'الأهداف' },
  { href: '/advisor', label: 'المستشار' },
  { href: '/reports', label: 'التقارير' },
  { href: '/workspace', label: 'مركز النظام' },
  { href: '/alerts', label: 'التنبيهات' },
  { href: '/settings', label: 'الإعدادات' },
] as const;

export function isPrimaryNavigationItemActive(pathname: string, href: string): boolean {
  return href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === href || pathname.startsWith(`${href}/`);
}
