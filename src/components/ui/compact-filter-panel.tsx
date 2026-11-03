'use client';

import { useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { LucideIcon } from './lucide-icon';

type Props = {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/** Filters stay hidden until the user explicitly opens the button. */
export function CompactFilterPanel({ title = 'تصفية', children, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={['ux-filter-dialog-trigger', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="ux-filter-icon-button"
        title={title}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <LucideIcon name="slidersHorizontal" size={20} />
      </button>
      <Dialog open={open} onOpenChange={setOpen} title={title} size="lg" className="ux-filter-dialog">
        <div className="ux-filter-dialog-fields">{children}</div>
      </Dialog>
    </div>
  );
}
