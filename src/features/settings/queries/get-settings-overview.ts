import { settingsRepository } from '@/repositories/settings-repository';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { listBudgetCategories } from '@/features/budget-categories/queries/list-budget-categories';

export async function getSettingsOverview(userId: string) {
  const [profile, accounts, budgetCategories, recurringObligations] = await Promise.all([
    settingsRepository.getProfile(userId),
    listAccounts(userId, true),
    listBudgetCategories(userId, true),
    settingsRepository.listRecurringObligations(userId),
  ]);
  return { profile, accounts, budgetCategories, recurringObligations };
}
