'use client';

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ActionIcon, inferActionIcon } from '@/components/ui/action-icon';
import { PrintButton } from '@/components/ui/print-button';

type Props = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  triggerClassName?: string;
  triggerAriaLabel?: string;
  triggerTitle?: string;
  defaultOpen?: boolean;
  printable?: boolean;
};

export function ActionDialog({ trigger, title, description, children, size = 'md', triggerClassName, triggerAriaLabel, triggerTitle, defaultOpen = false, printable }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const closeDialog = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) closeDialog();
  };

  const textTrigger = typeof trigger === 'string' ? trigger : '';
  const icon = inferActionIcon(textTrigger || title);
  const shouldPrint = printable ?? /تفاصيل|تقرير|كشف|ملخص/.test(title);
  return <>
    <button ref={triggerRef} type="button" className={triggerClassName ?? 'p49-modal-trigger'} aria-haspopup="dialog" aria-label={triggerAriaLabel} title={triggerTitle} onClick={() => setOpen(true)}>{textTrigger ? <span className="p49-trigger-content"><ActionIcon name={icon} /><span>{trigger}</span></span> : trigger}</button>
    <dialog
      ref={dialogRef}
      className={`p49-action-dialog is-${size}`}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleBackdropClick}
      onClose={() => setOpen(false)}
      onCancel={(event) => { event.preventDefault(); closeDialog(); }}
    >
      <div className="p49-dialog-shell" dir="rtl">
        <header className="p49-dialog-header">
          <div className="p49-dialog-title-block"><span className="p49-dialog-title-icon"><ActionIcon name={icon} /></span><div><h2 id={titleId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div></div>
          <div className="p49-dialog-tools">{shouldPrint ? <PrintButton/> : null}<button type="button" className="p49-dialog-close" aria-label="إغلاق النافذة" title="إغلاق" onClick={closeDialog}><ActionIcon name="close" /></button></div>
        </header>
        <div className="p49-dialog-body">{children}</div>
      </div>
    </dialog>
  </>;
}
