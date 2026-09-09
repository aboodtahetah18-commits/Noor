import type { OnboardingStatus } from '../types/onboarding';

export function resolveOnboardingRoute(status: OnboardingStatus): string {
  if (status.completed) return '/dashboard';
  if (!status.started || status.currentStep <= 1) return '/onboarding';
  if (status.accountsCount < 1 || status.currentStep === 2) return '/onboarding/accounts';
  if (!status.cycleId || status.expectedIncomeCount < 1 || status.currentStep === 3) return '/onboarding/income';
  if (!status.obligationsReviewed || status.currentStep === 4) return '/onboarding/obligations';
  if (!status.controlsReviewed || status.currentStep === 5) return '/onboarding/controls';
  return '/onboarding/plan';
}
