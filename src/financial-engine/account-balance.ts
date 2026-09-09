import { Money, sumMoney } from './money';

export interface AccountBalanceInput {
  openingBalance: Money;
  postedInflows: readonly Money[];
  postedOutflows: readonly Money[];
}

export function calculateAccountBalance(input: AccountBalanceInput): Money {
  return input.openingBalance
    .add(sumMoney(input.postedInflows))
    .subtract(sumMoney(input.postedOutflows));
}
