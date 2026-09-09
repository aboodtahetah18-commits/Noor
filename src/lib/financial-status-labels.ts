export const CYCLE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  ACTIVE: 'دورة نشطة',
  CLOSING: 'قيد الإغلاق',
  CLOSED: 'مغلقة',
};

export const OBLIGATION_STATUS_LABELS: Record<string, string> = {
  OVERDUE: 'متأخرة',
  DUE: 'مستحقة الآن',
  UPCOMING: 'قادمة',
  PAID: 'مدفوعة',
  CANCELLED: 'ملغاة',
};

export const BUDGET_STATUS_LABELS: Record<string, string> = {
  NORMAL: 'ضمن الخطة',
  AT_RISK: 'معرض للتجاوز',
  OVER_BUDGET: 'متجاوز',
};

export function financialStatusLabel(labels: Record<string, string>, status: string | null | undefined) {
  if (!status) return '—';
  return labels[status] ?? status;
}
