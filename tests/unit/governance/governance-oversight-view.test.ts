import { describe, expect, it } from 'vitest';
import { buildOversightPriorityItems, buildOversightSummaryMetrics, filterAndSortOversightItems } from '@/lib/governance/governance-oversight-view';

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

  it('builds priority-now items only from explicit attention rules',()=>{
    const priority=buildOversightPriorityItems({
      items,
      escalations:[{registryId:'r1',followupId:'f2'}],
    });
    expect(priority.map(entry=>entry.item.number)).toEqual([1,2,3]);
    expect(priority.find(entry=>entry.item.number===1)?.reasons.map(r=>r.code)).toEqual(['UNASSIGNED']);
    expect(priority.find(entry=>entry.item.number===2)?.reasons.map(r=>r.code)).toEqual(['OVERDUE','ESCALATED']);
    expect(priority.find(entry=>entry.item.number===3)?.reasons.map(r=>r.code)).toEqual(['BLOCKED']);
  });

  it('does not include ordinary assigned on-time followups in priority-now',()=>{
    const priority=buildOversightPriorityItems({
      items:[{number:9,registryId:'r9',followupId:'f9',status:'IN_PROGRESS',assignedTo:'مسؤول',timingState:'ON_TIME'}],
      escalations:[],
    });
    expect(priority).toEqual([]);
  });

  it('builds clickable summary counts from the same filter rules',()=>{
    const metrics=buildOversightSummaryMetrics({
      items,
      escalations:[{registryId:'r1',followupId:'f2'}],
    });
    const byFilter=Object.fromEntries(metrics.map(item=>[item.filter,item.count]));
    expect(byFilter).toMatchObject({
      ALL:3,
      OVERDUE:1,
      WAITING_USER:1,
      UNASSIGNED:1,
      BLOCKED:1,
      ESCALATED:1,
    });
  });
});
