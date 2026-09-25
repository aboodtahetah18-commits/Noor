import { describe, expect, it } from 'vitest';
import { backtestFinancialLearningAdjustment } from '../../src/lib/finance/financial-learning-backtest';

const expenseRows=[
  {cycleId:'c1',expectedIncome:8000,actualIncome:8000,plannedExpense:4000,actualExpense:4400,plannedSaving:1000,actualSaving:1000,projectedEndBalance:2000,actualEndBalance:2000},
  {cycleId:'c2',expectedIncome:8000,actualIncome:8000,plannedExpense:4000,actualExpense:4500,plannedSaving:1000,actualSaving:1000,projectedEndBalance:2000,actualEndBalance:2000},
  {cycleId:'c3',expectedIncome:8000,actualIncome:8000,plannedExpense:4000,actualExpense:4480,plannedSaving:1000,actualSaving:1000,projectedEndBalance:2000,actualEndBalance:2000},
  {cycleId:'c4',expectedIncome:8000,actualIncome:8000,plannedExpense:4000,actualExpense:4520,plannedSaving:1000,actualSaving:1000,projectedEndBalance:2000,actualEndBalance:2000},
];

describe('الاختبار الخلفي للتعلم المالي',()=>{
  it('ينجح عندما تحسن المعايرة الخطأ تاريخيًا خارج عينة التدريب لكل دورة',()=>{
    const result=backtestFinancialLearningAdjustment(expenseRows,'EXPENSE_BASELINE');
    expect(result.status).toBe('PASSED');
    expect(result.passed).toBe(true);
    expect(result.sampleSize).toBe(4);
    expect(result.baselineMaePercent).not.toBeNull();
    expect(result.candidateMaePercent).not.toBeNull();
    expect(result.candidateMaePercent!).toBeLessThan(result.baselineMaePercent!);
    expect(result.improvementPercent!).toBeGreaterThanOrEqual(5);
  });

  it('لا يختبر تعديلًا رقميًا لتوقع نهاية الدورة إذا لم توجد معايرة رقمية',()=>{
    const result=backtestFinancialLearningAdjustment(expenseRows,'FORECAST_CALIBRATION');
    expect(result.status).toBe('REVIEW_ONLY');
    expect(result.passed).toBe(false);
    expect(result.candidateMaePercent).toBeNull();
  });

  it('يرفض العينة غير الكافية',()=>{
    const result=backtestFinancialLearningAdjustment(expenseRows.slice(0,2),'EXPENSE_BASELINE');
    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.passed).toBe(false);
  });

  it('لا يعتبر أي تغيير ناجحًا لمجرد وجود ثلاث دورات',()=>{
    const base=expenseRows[0]!;
    const unstable=[
      {...base,cycleId:'u1',actualExpense:2000},
      {...base,cycleId:'u2',actualExpense:6000},
      {...base,cycleId:'u3',actualExpense:4000},
      {...base,cycleId:'u4',actualExpense:6500},
    ];
    const result=backtestFinancialLearningAdjustment(unstable,'EXPENSE_BASELINE');
    expect(result.passed).toBe(false);
  });
});
