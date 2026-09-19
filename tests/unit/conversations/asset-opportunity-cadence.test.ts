import { describe, expect, it } from 'vitest';
import { resolveOpportunityCadence } from '@/lib/conversations/asset-opportunity-cadence';

describe('asset opportunity discovery cadence',()=>{
  it('searches every one to three days while the opportunity list is thin',()=>{
    expect(resolveOpportunityCadence(0)).toMatchObject({mode:'ACTIVE_DISCOVERY',interval_days:1});
    expect(resolveOpportunityCadence(1)).toMatchObject({mode:'ACTIVE_DISCOVERY',interval_days:2});
    expect(resolveOpportunityCadence(2)).toMatchObject({mode:'ACTIVE_DISCOVERY',interval_days:3});
  });

  it('backs off after three or four viable opportunities',()=>{
    expect(resolveOpportunityCadence(3)).toMatchObject({mode:'WEEKLY_REVIEW',interval_days:7});
    expect(resolveOpportunityCadence(4)).toMatchObject({mode:'MONTHLY_REVIEW',interval_days:30});
  });
});
