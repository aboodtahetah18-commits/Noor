export const APPROVED_ADVISORS = [
  { key:'budget-spending-advisor', name:'مستشار الميزانية والإنفاق' },
  { key:'obligations-advisor', name:'مستشار الالتزامات' },
  { key:'goals-advisor', name:'مستشار الأهداف' },
  { key:'investment-advisor', name:'مستشار الاستثمار' },
  { key:'liquidity-advisor', name:'مستشار السيولة' },
  { key:'economic-advisor', name:'المستشار الاقتصادي' },
] as const;

export type ApprovedAdvisorKey = typeof APPROVED_ADVISORS[number]['key'];
export const APPROVED_ADVISOR_NAMES = new Set(APPROVED_ADVISORS.map(item=>item.name));
