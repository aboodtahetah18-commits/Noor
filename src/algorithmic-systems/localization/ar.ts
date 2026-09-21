export const ar = {
  SYNCED:"متزامن",
  STALE:"يحتاج تحديثًا",
  PENDING_CONFIRMATION:"بانتظار التأكيد",
  CONFLICT:"تعارض في البيانات",
  UNAVAILABLE:"غير متاح",
  MANUAL_ONLY:"يعتمد على الإدخال اليدوي",
  VERY_HIGH:"مرتفعة جدًا",
  HIGH:"مرتفعة",
  MEDIUM:"متوسطة",
  LOW:"منخفضة",
  VERY_LOW:"منخفضة جدًا",
  OPEN:"مفتوحة",
  DATA_COLLECTION:"جمع البيانات",
  ANALYSIS:"قيد التحليل",
  CONFLICT_RESOLUTION:"معالجة تعارض البيانات",
  COMMITTEE_REVIEW:"مراجعة اللجنة",
  DECISION_READY:"القرار جاهز للمراجعة",
  DECISION_APPROVED:"القرار معتمد",
  USER_ACTION_PENDING:"بانتظار تنفيذ المستخدم",
  EXECUTION_PARTIAL:"تنفيذ جزئي",
  EXECUTION_CONFIRMED:"تم التحقق من التنفيذ",
  MONITORING:"قيد المتابعة",
  REASSESSMENT:"إعادة تقييم",
  FINAL_DECISION:"القرار النهائي",
  CLOSED:"مغلقة"
} as const;

export function toArabicLabel(key:keyof typeof ar):string {
  return ar[key];
}
