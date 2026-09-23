export const primaryNavigationItems = [
  { href: '/conversations', label: 'مركز العمل' },
  { href: '/bank-operations', label: 'البنوك' },
  { href: '/investments', label: 'الاستثمارات' },
  { href: '/governance', label: 'المعرفة' },
  { href: '/cases', label: 'القرارات' },
  { href: '/reports', label: 'المرصد' },
  { href: '/advisor', label: 'مختبر الخوارزميات' },
  { href: '/settings', label: 'الإعدادات' },
] as const;

export function isPrimaryNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
