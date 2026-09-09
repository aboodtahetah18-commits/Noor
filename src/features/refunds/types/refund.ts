export type RefundResult = {
  transactionId:string;
  originalTransactionId:string;
  status:'POSTED';
  amount:string;
  transactionDate:string;
  accountId:string;
  categoryId:string;
  originalExpenseAmount:string;
  totalRefunded:string;
  remainingRefundable:string;
  accountBalanceAfter:string;
  categoryActualAfter:string;
  postedAt:string;
  safeToSpendStatus:'BUFFER_POLICY_REQUIRED';
  safeToSpendBlockingIssue:'BUFFER_POLICY_REQUIRED';
};
