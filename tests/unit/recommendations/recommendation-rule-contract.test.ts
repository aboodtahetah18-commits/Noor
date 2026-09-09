import { describe, expect, it } from 'vitest';
import { RECOMMENDATION_REASON_CODES } from '@/features/recommendations/types/recommendation';
describe('Phase 22 recommendation contract',()=>{it('contains only the documented V1 reason codes',()=>{expect(RECOMMENDATION_REASON_CODES).toEqual(['DEFICIT_RISK','OBLIGATION_OVERDUE','OBLIGATION_UPCOMING','SAFE_TO_SPEND_ZERO','GOAL_UNREALISTIC','SURPLUS_AVAILABLE','OVER_BUDGET']);});});
