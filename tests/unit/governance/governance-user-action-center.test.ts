import { describe, expect, it } from 'vitest';
import { buildGovernanceUserActionItems } from '@/lib/governance/governance-user-action-center';

describe('governance user action center',()=>{
  it('contains only followups explicitly waiting for the user',()=>{
    const items=buildGovernanceUserActionItems([
      {number:1,registryId:'r1',followupId:'f1',title:'أ',decisionTitle:'قرار',status:'WAITING_USER',history:[]},
      {number:2,registryId:'r1',followupId:'f2',title:'ب',decisionTitle:'قرار',status:'WAITING_OWNER',history:[]},
      {number:3,registryId:'r1',followupId:'f3',title:'ج',decisionTitle:'قرار',status:'IN_PROGRESS',history:[]},
    ]);
    expect(items.map(item=>item.followupNumber)).toEqual([1]);
  });

  it('surfaces the latest explicit data request without inventing a requirement',()=>{
    const items=buildGovernanceUserActionItems([{
      number:4,registryId:'r4',followupId:'f4',title:'مستندات',decisionTitle:'قرار',status:'WAITING_USER',
      history:[
        {eventType:'DATA_REQUESTED',detail:'كشف الحساب للشهر الحالي',createdAt:'2026-09-20T12:00:00Z'},
        {eventType:'STATUS_CHANGED',detail:'أقدم',createdAt:'2026-09-20T11:00:00Z'},
      ],
    }]);
    expect(items[0]).toMatchObject({
      actionKind:'PROVIDE_REQUESTED_DATA',
      requestDetail:'كشف الحساب للشهر الحالي',
      openCommand:'فتح المتابعة 4',
    });
  });

  it('uses a generic response action when no structured data request exists',()=>{
    const items=buildGovernanceUserActionItems([{
      number:5,registryId:'r5',followupId:'f5',title:'رد المستخدم',decisionTitle:'قرار',status:'WAITING_USER',history:[],
    }]);
    expect(items[0]).toMatchObject({actionKind:'RESPOND_TO_FOLLOWUP',requestDetail:null});
  });
});
