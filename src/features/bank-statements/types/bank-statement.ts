export type DetectedKind = 'EXPENSE'|'INCOME'|'TRANSFER'|'REFUND'|'FEE'|'UNKNOWN';
export type StatementDirection = 'DEBIT'|'CREDIT';

export type ParsedStatementRow = {
  rowNumber: number;
  transactionDate: string | null;
  transactionTime?: string | null;
  description: string;
  amount: string;
  direction: StatementDirection;
  detectedKind: DetectedKind;
  normalizedMerchant: string | null;
  confidence: number;
  reviewStatus: 'AUTO'|'NEEDS_REVIEW';
  rawPayload: string;
};
