import { describe, expect, it } from 'vitest';
import { filterAndSortOversightItems } from '@/lib/governance/governance-oversight-view';

const items=[
  {number:1,registryId:'r1',followupId:'f1',status:'WAITING_USER',assignedTo:null,dueDate:null,timingState:'NO_DUE_DATE',history:[{createdAt:'2026-09-20T10:00:00Z'}]},
  {number:2,registryId:'r1',followupId:'f2',status:'IN_PROGRESS',assignedTo:'مسؤول',dueDate:'2026-09-19',timingState:'OVERDUE',history:[{createdAt:'2026-09-20T12:00:00Z'}]},
  {number:3,registryId:'r2',followupId:'f3',status:'BLOCKED',assignedTo:'مسؤول',dueDate:'2026-09-25',timingState:'ON_TIME',history:[{createdAt:'2026-09-20T11:00:00Z'}]},
];

describe('governance oversight view',()=>{
  it('filters governed categories',()=>{
    expect(filterAndSortOversightItems({items,escalations:[],filter:'OVERDUE',sort:'DEFAULT'}).map(x=>x.number)).toEqual([2]);
    expect(filterAndSortOversightItems({items,escalations:[],filter:'WAITING_USER',sort:'DEFAULT'}).map(x=>x.number)).toEqual([1]);
    expect(filterAndSortOversightItems({items,escalations:[],filter:'UNASSIGNED',sort:'DEFAULT'}).map(x=>x.number)).toEqual([1]);
    expect(filterAndSortOversightItems({items,escalations:[],filter:'BLOCKED',sort:'DEFAULT'}).map(x=>x.number)).toEqual([3]);
    expect(filterAndSortOversightItems({items,escalations:[{registryId:'r1',followupId:'f2'}],filter:'ESCALATED',sort:'DEFAULT'}).map(x=>x.number)).toEqual([2]);
  });

  it('sorts by approved due date with undated items last',()=>{
    expect(filterAndSortOversightItems({items,escalations:[],filter:'ALL',sort:'DUE_DATE'}).map(x=>x.number)).toEqual([2,3,1]);
  });

  it('sorts by latest recorded update',()=>{
    expect(filterAndSortOversightItems({items,escalations:[],filter:'ALL',sort:'LAST_UPDATE'}).map(x=>x.number)).toEqual([2,3,1]);
  });
});
