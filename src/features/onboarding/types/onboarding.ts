export type OnboardingStep = 1|2|3|4|5|6;
export interface OnboardingStatus {
  started:boolean;
  currentStep:OnboardingStep;
  completed:boolean;
  accountsCount:number;
  cycleId:string|null;
  cycleStatus:string|null;
  cycleStartDate:string|null;
  expectedIncomeCount:number;
  obligationsCount:number;
  obligationsReviewed:boolean;
  controlsReviewed:boolean;
  emergencyConfigured:boolean;
  goalsCount:number;
  planId:string|null;
  planStatus:string|null;
  categoriesCount:number;
}
