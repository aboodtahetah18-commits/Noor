import { describe, expect, it } from 'vitest';
import { parseMeetingAgendaCommand } from '@/lib/allocation/financial-meeting-agenda-tracking';

describe('financial meeting agenda tracking commands',()=>{
  it('parses explicit agenda state changes',()=>{
    expect(parseMeetingAgendaCommand('حسم البند 2: تمت مراجعة السبب')).toEqual({kind:'UPDATE',itemNumber:2,status:'RESOLVED',note:'تمت مراجعة السبب',referredTo:null});
    expect(parseMeetingAgendaCommand('البند 1 يحتاج بيانات: كشف الحساب')).toEqual({kind:'UPDATE',itemNumber:1,status:'NEEDS_DATA',note:'كشف الحساب',referredTo:null});
    expect(parseMeetingAgendaCommand('إحالة البند 3 إلى مسؤول الاستثمار')).toEqual({kind:'UPDATE',itemNumber:3,status:'REFERRED',note:null,referredTo:'مسؤول الاستثمار'});
    expect(parseMeetingAgendaCommand('البند 4 جاهز للقرار')).toEqual({kind:'UPDATE',itemNumber:4,status:'READY_FOR_DECISION',note:null,referredTo:null});
  });

  it('requires explicit meeting close language',()=>{
    expect(parseMeetingAgendaCommand('إنهاء الاجتماع')).toEqual({kind:'CLOSE_MEETING'});
    expect(parseMeetingAgendaCommand('تمام')).toBeNull();
  });
});
