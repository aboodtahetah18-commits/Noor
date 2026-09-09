export type ProfileSettings = {
  displayName: string | null;
  baseCurrency: 'SAR';
  timezone: string;
};

export type RecurringObligationTemplateSetting = {
  id: string;
  name: string;
  defaultAmount: string;
  recurrence: string;
  priority: number | null;
  expectedAccountId: string | null;
  expectedAccountName: string | null;
  isActive: boolean;
};
