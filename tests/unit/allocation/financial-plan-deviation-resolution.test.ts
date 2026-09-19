import { describe, expect, it } from 'vitest';
import { parseDeviationResolutionCommand } from '@/lib/allocation/financial-plan-deviation-resolution';

describe('financial plan deviation resolution commands',()=>{
  it('requires explicit commands',()=>{
    expect(parseDeviationResolutionCommand('اعتماد إبقاء الخطة')).toEqual({kind:'KEEP_PLAN'});
    expect(parseDeviationResolutionCommand('فتح إعادة تفاوض')).toEqual({kind:'OPEN_REPLAN'});
    expect(parseDeviationResolutionCommand('اعتماد الخيار 3')).toEqual({kind:'SELECT_OPTION',optionNumber:3});
    expect(parseDeviationResolutionCommand('موافق')).toBeNull();
    expect(parseDeviationResolutionCommand('تمام')).toBeNull();
  });
});
