import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

export function FocusedNextStep({ href, eyebrow = 'الخطوة التالية', title }: {
  href: string;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <nav className="p74-next-step" aria-label="الخطوة التالية في المسار المالي">
      <div>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>
      <Link href={href}><span>التالي</span><LucideIcon name="chevronLeft" size={20}/></Link>
    </nav>
  );
}
