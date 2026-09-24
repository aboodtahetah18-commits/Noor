import { describe, expect, it } from 'vitest';
import { fuelMonthlyCost, maintenanceForecast, monthlyRecurringTotal, remainingAfter, sumFinancialValues } from './financial-form-calculations';

describe('financial form calculations',()=>{
  it('calculates daily and weekly recurring spend as a monthly amount',()=>{
    expect(monthlyRecurringTotal('يومي',2,20)).toBe(1200);
    expect(monthlyRecurringTotal('أسبوعي',2,50)).toBe(433.33);
    expect(monthlyRecurringTotal('شهري',3,40)).toBe(120);
    expect(monthlyRecurringTotal('يومي',2,20,'أيام العمل')).toBe(880);
    expect(monthlyRecurringTotal('يومي',2,20,'نهاية الأسبوع')).toBe(320);
  });

  it('calculates fuel cost from distance, efficiency and liter price',()=>{
    expect(fuelMonthlyCost(5000,19.8,2.18)).toBe(550.51);
    expect(fuelMonthlyCost(5000,0,2.18)).toBe(0);
  });

  it('calculates alternating maintenance over a horizon',()=>{
    expect(maintenanceForecast({
      intervalValue:2,
      forecastValue:4,
      primaryAmount:145,
      alternateAmount:225,
      alternating:true,
    })).toEqual({occurrences:2,total:370});
  });

  it('never returns a negative remaining amount',()=>{
    expect(remainingAfter(100,70)).toBe(30);
    expect(remainingAfter(100,130)).toBe(0);
  });

  it('sums mixed numeric form values',()=>{
    expect(sumFinancialValues(['10','20.5',null,5])).toBe(35.5);
  });
});
