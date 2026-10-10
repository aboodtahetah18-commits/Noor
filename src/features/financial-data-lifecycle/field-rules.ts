/**
 * Progressive financial-data collection contract.
 * Pure metadata: does not persist personal data or execute financial actions.
 */
export type DataStage = 'FOUNDATION' | 'LATER' | 'OPERATION';
export type FinancialOperation = 'INVESTMENT' | 'INTERNAL_LOAN' | 'SALARY_ALLOCATION' | 'EXPENSE';
export type FinancialField =
  | 'displayName' | 'monthlyIncome' | 'incomeFrequency' | 'primaryOperatingAccount'
  | 'openingBalance' | 'savingsGoal' | 'protectedEmergencyReserve'
  | 'recurringObligations' | 'riskTolerance' | 'investmentHorizon'
  | 'investmentAmount' | 'investmentSourceBank' | 'investmentInstrument'
  | 'loanAmount' | 'loanBorrowerBank' | 'loanLenderBank' | 'loanTermMonths'
  | 'salaryAmount' | 'salaryAllocationPlan' | 'expenseAmount' | 'expenseCategory';
export interface FieldRule {
  field: FinancialField;
  stage: DataStage;
  required: boolean;
  operation?: FinancialOperation;
  label: string;
}
export const financialFieldRules: readonly FieldRule[] = [
  { field:'displayName', stage:'FOUNDATION', required:true, label:'الاسم المعروض' },
  { field:'monthlyIncome', stage:'FOUNDATION', required:true, label:'الدخل الأساسي' },
  { field:'incomeFrequency', stage:'FOUNDATION', required:true, label:'دورية الدخل' },
  { field:'primaryOperatingAccount', stage:'FOUNDATION', required:true, label:'الحساب التشغيلي الأساسي' },
  { field:'openingBalance', stage:'FOUNDATION', required:false, label:'الرصيد الافتتاحي' },
  { field:'savingsGoal', stage:'LATER', required:false, label:'هدف الادخار' },
  { field:'protectedEmergencyReserve', stage:'LATER', required:false, label:'الاحتياطي المحمي' },
  { field:'recurringObligations', stage:'LATER', required:false, label:'الالتزامات الدورية' },
  { field:'riskTolerance', stage:'OPERATION', operation:'INVESTMENT', required:true, label:'مستوى تحمل المخاطر' },
  { field:'investmentHorizon', stage:'OPERATION', operation:'INVESTMENT', required:true, label:'الأفق الاستثماري' },
  { field:'investmentAmount', stage:'OPERATION', operation:'INVESTMENT', required:true, label:'مبلغ الاستثمار' },
  { field:'investmentSourceBank', stage:'OPERATION', operation:'INVESTMENT', required:true, label:'مصدر تمويل الاستثمار' },
  { field:'investmentInstrument', stage:'OPERATION', operation:'INVESTMENT', required:true, label:'الأداة الاستثمارية' },
  { field:'loanAmount', stage:'OPERATION', operation:'INTERNAL_LOAN', required:true, label:'مبلغ السلفة' },
  { field:'loanBorrowerBank', stage:'OPERATION', operation:'INTERNAL_LOAN', required:true, label:'البنك المقترض' },
  { field:'loanLenderBank', stage:'OPERATION', operation:'INTERNAL_LOAN', required:true, label:'البنك الممول' },
  { field:'loanTermMonths', stage:'OPERATION', operation:'INTERNAL_LOAN', required:true, label:'مدة السداد' },
  { field:'salaryAmount', stage:'OPERATION', operation:'SALARY_ALLOCATION', required:true, label:'الراتب الوارد' },
  { field:'salaryAllocationPlan', stage:'OPERATION', operation:'SALARY_ALLOCATION', required:true, label:'التوزيع المقترح' },
  { field:'expenseAmount', stage:'OPERATION', operation:'EXPENSE', required:true, label:'قيمة المصروف' },
  { field:'expenseCategory', stage:'OPERATION', operation:'EXPENSE', required:true, label:'بند المصروف' },
];
export function fieldsForStage(stage: DataStage, operation?: FinancialOperation): readonly FieldRule[] {
  if (stage === 'OPERATION' && !operation) throw new Error('OPERATION_REQUIRED');
  return financialFieldRules.filter(rule => rule.stage === stage && (stage !== 'OPERATION' || rule.operation === operation));
}
export function missingRequiredFields(stage: DataStage, values: Partial<Record<FinancialField, unknown>>, operation?: FinancialOperation): FinancialField[] {
  return fieldsForStage(stage, operation).filter(rule => {
    if (!rule.required) return false;
    const value = values[rule.field];
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  }).map(rule => rule.field);
}
export function classifyDataRequest(field: FinancialField): FieldRule {
  const rule = financialFieldRules.find(entry => entry.field === field);
  if (!rule) throw new Error('UNKNOWN_FINANCIAL_FIELD');
  return rule;
}
