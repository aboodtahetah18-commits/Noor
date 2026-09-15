import { describe,expect,it } from 'vitest';
import { mapFinancialDatabaseError } from '@/features/financial-engine/services/financial-platform-error';

describe('financial platform error mapping',()=>{
  it('maps internal NAMAA state errors to stable public conflict codes',()=>{
    const error=mapFinancialDatabaseError(new Error('NAMAA_INVALID_STATE_TRANSITION: internal table details'));
    expect(error.code).toBe('INVALID_STATE_TRANSITION');
    expect(error.httpStatus).toBe(409);
    expect(error.message).not.toContain('internal table details');
  });

  it('does not expose unknown database/provider messages',()=>{
    const error=mapFinancialDatabaseError(new Error('password authentication failed for user secret-role'));
    expect(error.code).toBe('FINANCIAL_PLATFORM_FAILED');
    expect(error.httpStatus).toBe(500);
    expect(error.message).not.toContain('password');
  });
});
