'use client';

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'start' | 'end';
  closeLabel?: string;
  className?: string;
};

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = 'end',
  closeLabel = 'إغلاق اللوحة',
  className = '',
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const close = () => onOpenChange(false);
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) close();
  };

  return (
    <dialog
      ref={ref}
      className={`ux-drawer-surface ${className}`.trim()}
      data-side={side}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={onBackdrop}
      onClose={close}
      onCancel={(event) => { event.preventDefault(); close(); }}
    >
      <div className="ux-overlay-shell" dir="rtl">
        <header className="ux-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button type="button" className="ux-dialog-close" aria-label={closeLabel} onClick={close}>×</button>
        </header>
        <div className="ux-dialog-body">{children}</div>
        {footer ? <footer className="ux-dialog-actions">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
