import { describe, expect, it } from 'vitest';
import { normalizeStructuredOnboardingPayload } from '@/lib/conversations/governor-onboarding';

describe('governed structured governor onboarding', () => {
  it('keeps each account as an independent structured record', () => {
    const result=normalizeStructuredOnboardingPayload({
      step:'accounts',
      items:[
        {bank_name:'البنك الأول',account_type:'BANK',short_identifier:'الراتب',usage:'راتب',opening_balance:1000,included_in_namaa:true},
        {bank_name:'البنك الثاني',account_type:'SAVINGS',short_identifier:'ادخار',usage:'احتياطي',opening_balance:5000,included_in_namaa:true},
      ],
    });
    expect(result).toMatchObject({
      items:[
        {bank_name:'البنك الأول',short_identifier:'الراتب',opening_balance:1000,included_in_namaa:true},
        {bank_name:'البنك الثاني',short_identifier:'ادخار',opening_balance:5000,included_in_namaa:true},
      ],
    });
  });

  it('keeps only a valid Saudi IBAN and the last four card digits as governed identifiers', () => {
    const result=normalizeStructuredOnboardingPayload({
      step:'accounts',
      items:[{
        bank_name:'بنك',
        account_type:'BANK',
        iban:'SA0380000000608010167519',
        card_last4:'6883',
        card_type:'فيزا',
        opening_balance:100,
        included_in_namaa:true,
      }],
    });
    expect(result).toMatchObject({items:[{iban:'SA0380000000608010167519',card_last4:'6883',card_type:'فيزا'}]});
  });

  it('rejects a full or malformed card identifier instead of storing it', () => {
    expect(()=>normalizeStructuredOnboardingPayload({
      step:'accounts',
      items:[{
        bank_name:'بنك',
        account_type:'BANK',
        card_last4:'4111111111111111',
        opening_balance:100,
        included_in_namaa:true,
      }],
    })).toThrow('ONBOARDING_ACCOUNT_CARD_LAST4_INVALID');
  });

  it('requires an explanation when computed and actual net income differ', () => {
    expect(()=>normalizeStructuredOnboardingPayload({
      step:'income',
      base_salary:10000,
      fixed_allowances:1000,
      deductions:500,
      actual_net:9000,
    })).toThrow('ONBOARDING_INCOME_DIFFERENCE_EXPLANATION_REQUIRED');
  });

  it('records an explained salary difference without inventing missing components', () => {
    const result=normalizeStructuredOnboardingPayload({
      step:'income',
      base_salary:10000,
      fixed_allowances:1000,
      deductions:500,
      actual_net:9000,
      difference_explanation:'خصم متغير ظهر هذا الشهر',
    });
    expect(result).toMatchObject({
      base_salary:10000,
      fixed_allowances:1000,
      variable_allowances:0,
      deductions:500,
      other_recurring_income:0,
      expected_net:10500,
      actual_net:9000,
      reconciliation_status:'EXPLAINED_DIFFERENCE',
    });
  });

  it('allows an empty dependent group when the user has no financial dependents', () => {
    expect(normalizeStructuredOnboardingPayload({step:'dependents',items:[]})).toEqual({items:[]});
  });

  it('allows an empty obligation group when the user confirms no known obligations', () => {
    expect(normalizeStructuredOnboardingPayload({step:'obligations',items:[]})).toEqual({items:[]});
  });

  it('allows an empty goal group without creating a financial obligation', () => {
    expect(normalizeStructuredOnboardingPayload({step:'goals',items:[]})).toEqual({items:[]});
  });

  it('rejects malformed obligation amounts instead of guessing', () => {
    expect(()=>normalizeStructuredOnboardingPayload({
      step:'obligations',
      items:[{name:'قسط سيارة',amount:0,recurrence:'MONTHLY'}],
    })).toThrow('ONBOARDING_OBLIGATION_INVALID');
  });
});
