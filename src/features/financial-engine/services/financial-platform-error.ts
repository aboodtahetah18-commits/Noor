export class FinancialPlatformError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(code);
    this.name = 'FinancialPlatformError';
  }
}

export function databaseErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function mapFinancialDatabaseError(error: unknown): FinancialPlatformError {
  if (error instanceof FinancialPlatformError) return error;
  const message = databaseErrorText(error);

  if (message.includes('NAMAA_INVALID_STATE_TRANSITION')) {
    return new FinancialPlatformError('INVALID_STATE_TRANSITION', 409);
  }
  if (message.includes('NAMAA_DECISION_BLOCKED_BY_RECOMMENDATION_GATE')) {
    return new FinancialPlatformError('RECOMMENDATION_BLOCKED', 409);
  }
  if (message.includes('NAMAA_DECISION_CONDITIONAL_REQUIRES_REVALIDATION')) {
    return new FinancialPlatformError('RECOMMENDATION_REVALIDATION_REQUIRED', 409);
  }
  if (message.includes('NAMAA_DECISION_RECOMMENDATION_GATE_REQUIRED')) {
    return new FinancialPlatformError('RECOMMENDATION_GATE_REQUIRED', 409);
  }
  if (message.includes('NAMAA_USER_DECISION_REQUIRES_USER_DECISION_REQUIRED')) {
    return new FinancialPlatformError('DECISION_NOT_AWAITING_USER', 409);
  }
  if (message.includes('NAMAA_APPROVAL_REQUIRES_USER_APPROVE_DECISION')) {
    return new FinancialPlatformError('USER_APPROVAL_REQUIRED', 409);
  }
  if (message.includes('NAMAA_EXECUTION_REQUIRES_APPROVED_REQUEST') || message.includes('NAMAA_EXECUTION_REQUIRES_RECORDED_USER_APPROVAL')) {
    return new FinancialPlatformError('EXECUTION_NOT_AUTHORIZED', 409);
  }
  if (message.includes('NAMAA_VERIFIED_EXECUTION_REQUIRES_MATCHED_EVIDENCE') || message.includes('NAMAA_EXECUTION_EVIDENCE_NOT_VERIFIED')) {
    return new FinancialPlatformError('EVIDENCE_NOT_VERIFIED', 409);
  }
  if (message.includes('NAMAA_')) {
    return new FinancialPlatformError('FINANCIAL_RULE_CONFLICT', 409);
  }
  return new FinancialPlatformError('FINANCIAL_PLATFORM_FAILED', 500);
}
