import type { ButtonHTMLAttributes } from 'react';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';

export type ActionIconName = 'add'|'edit'|'view'|'disable'|'transfer'|'save'|'settings'|'wallet'|'receipt'|'income'|'refund'|'more'|'check'|'close'|'bankMessage'|'operations';

const mapping: Record<ActionIconName, LucideIconName> = {
  add:'plus',edit:'pencil',view:'eye',disable:'ban',transfer:'repeat2',save:'save',settings:'settings',wallet:'walletCards',receipt:'receiptText',income:'banknote',refund:'refreshCw',more:'ellipsis',check:'check',close:'x',bankMessage:'messageSquareText',operations:'listChecks'
};

export function ActionIcon({ name, className = 'p49-ui-icon' }: { name: ActionIconName; className?: string }) {
  return <LucideIcon name={mapping[name]} size={24} className={className} />;
}

export type ActionIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  name: ActionIconName;
  label: string;
  loading?: boolean;
};

export function ActionIconButton({ name, label, loading = false, className = '', disabled, type = 'button', title, ...props }: ActionIconButtonProps) {
  return (
    <button
      type={type}
      className={`ux-action-icon-button ${className}`.trim()}
      aria-label={label}
      title={title ?? label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="ux-loading-spinner" aria-hidden="true" /> : <ActionIcon name={name} />}
    </button>
  );
}

export function inferActionIcon(label: string): ActionIconName {
  if (/إغلاق|رجوع/.test(label)) return 'close';
  if (/تعطيل|إلغاء|حذف|إيقاف/.test(label)) return 'disable';
  if (/تعديل|تحرير/.test(label)) return 'edit';
  if (/تفاصيل|عرض|مشاهدة/.test(label)) return 'view';
  if (/تحويل|مساهمة|سحب|سداد/.test(label)) return 'transfer';
  if (/حفظ|اعتماد|تأكيد/.test(label)) return 'save';
  if (/إعداد|تهيئة/.test(label)) return 'settings';
  if (/دخل/.test(label)) return 'income';
  if (/استرداد/.test(label)) return 'refund';
  if (/مصروف/.test(label)) return 'receipt';
  if (/إضافة|إنشاء|تسجيل/.test(label)) return 'add';
  return 'more';
}
