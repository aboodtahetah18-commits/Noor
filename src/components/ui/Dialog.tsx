'use client';

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeLabel?: string;
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = 'إغلاق النافذة',
  className = '',
}: DialogProps) {
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
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [open]);

  const close = () => onOpenChange(false);
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) close();
  };

  return (
    <dialog
      ref={ref}
      className={`ux-overlay-dialog ux-dialog-surface is-${size} ${className}`.trim()}
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
