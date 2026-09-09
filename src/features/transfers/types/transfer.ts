export type TransferResult = {
  transferId: string;
  status: 'POSTED';
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transactionDate: string;
  outTransactionId: string;
  inTransactionId: string;
  fromAccountBalanceAfter: string;
  toAccountBalanceAfter: string;
  totalLiquidityChange: '0.00';
  postedAt: string;
};
