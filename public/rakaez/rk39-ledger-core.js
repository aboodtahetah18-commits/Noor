/* ركائز 39 — دفتر المخصصات التشغيلي المستقل.
   وحدة حسابات مستقلة، لا تعدل أي رصيد بنكي أو قيود دفتر الأستاذ الأصلي. */
(function(root,factory){
  const core=factory();
  if(typeof module==='object' && module.exports)module.exports=core;
  if(root)root.RakaezHilalCore=core;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PERIOD=/^(20\d{2})-(0[1-9]|1[0-2])$/;
 const BANKS={malaa:'بنك ملاءة',assets:'بنك الأصول'};
 const MONEY_FIELDS=['allocation','amount'];
 function assert(ok,message){if(!ok)throw new Error(message)}
 function int(n){return Number.isSafeInteger(n) && n>=0}
 function period(p){assert(typeof p==='string'&&PERIOD.test(p),'الشهر غير صالح؛ استخدم السنة ثم الشهر.');return p}
 function positive(n){assert(int(n)&&n>0,'أدخل مبلغًا صحيحًا أكبر من صفر.');return n}
 function value(n){assert(Number.isSafeInteger(n),'قيمة مالية غير صحيحة.');return n}
 function read(db){
   const source=db&&db.rk39;
   return source && source.version===1 && source.months && Array.isArray(source.events)?source:{version:1,months:{},events:[]};
 }
 function ensure(db){
   assert(db && typeof db==='object','لا توجد قاعدة بيانات محلية.');
   if(!db.rk39)db.rk39={version:1,months:{},events:[]};
   assert(db.rk39.version===1&&db.rk39.months&&Array.isArray(db.rk39.events),'إصدار غير مدعوم لسجل المخصصات.');
   return db.rk39;
 }
 function expense(db,p){
  period(p);
  return (Array.isArray(db.transactions)?db.transactions:[]).filter(x=>x&&x.type==='expense'&&String(x.date||'').slice(0,7)===p).reduce((sum,x)=>{
   const n=Number(x.amount);assert(int(n),'يوجد مصروف مسجل بقيمة غير صحيحة في '+p);return value(sum+n);
  },0);
 }
 function eventDelta(event,p){
   const amount=Number(event.amount)||0;
   let delta=0,held=0;
   if(event.status==='cancelled')return {delta,held};
   if(event.kind==='rollover'&&event.status==='posted'){
     if(event.from===p)delta-=amount;
     if(event.to===p)delta+=amount;
   }
   if(event.kind==='reserve-add'&&event.status==='posted'&&event.from===p)delta-=amount;
   if(event.kind==='reserve-release'&&event.status==='posted'&&event.to===p)delta+=amount;
   if(event.kind==='bank-transfer'&&event.from===p){
     if(event.status==='confirmed'||event.status==='matched')delta-=amount;
     if(event.status==='pending')held+=amount;
   }
   return {delta,held};
 }
 function monthly(db,p){
   period(p);
   const registry=read(db);const record=registry.months[p]||null;
   const alloc=record?Number(record.allocation):0;
   assert(int(alloc),'مخصص الشهر المسجل غير صحيح.');
   const used=expense(db,p);
   let adjustment=0,held=0;
   for(const e of registry.events){const d=eventDelta(e,p);adjustment=value(adjustment+d.delta);held=value(held+d.held);}
   const beforeHolds=value(alloc+adjustment-used);
   const free=value(beforeHolds-held);
   return {period:p,posted:!!record,allocation:alloc,expenses:used,adjustments:adjustment,holds:held,beforeHolds,free,deficit:free<0};
 }
 function reserveBalance(db){
   let sum=0;
   for(const e of read(db).events){
     if(e.status!=='posted')continue;
     if(e.kind==='reserve-add'||e.kind==='reserve-opening')sum=value(sum+e.amount);
     if(e.kind==='reserve-release')sum=value(sum-e.amount);
   }
   return sum;
 }
 function reserve(db){
   const target=Number(db?.reserves?.hilal)||0;
   assert(int(target),'الاحتياطي المستهدف غير صحيح.');
   const earmarked=reserveBalance(db);
   return {target,earmarked,gap:Math.max(0,target-earmarked),progress:target>0?Math.min(100,Math.round(earmarked/target*1000)/10):0,excess:Math.max(0,earmarked-target)};
 }
 function verifyInvariants(db){
   const state=read(db),ids=new Set();
   for(const [p,row] of Object.entries(state.months)){
    period(p);assert(row&&int(Number(row.allocation)),'بيانات مخصص غير صحيحة '+p);
   }
   for(const e of state.events){
    assert(e&&typeof e.id==='string'&&!ids.has(e.id),'معرّف عملية مكرر أو مفقود.');ids.add(e.id);
    positive(e.amount);
    if(e.from)period(e.from);if(e.to)period(e.to);
    if(e.kind==='bank-transfer')assert(BANKS[e.targetBank],'اسم البنك المستفيد غير صالح.');
   }
   assert(reserveBalance(db)>=0,'الاحتياطي المحجوز سالب؛ يلزم تصحيح السجل.');
   return true;
 }
 function id(){return 'rk39-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));}
 function makeEvent(kind,input,status){return {id:id(),kind,status,amount:positive(input.amount),from:input.from||null,to:input.to||null,targetBank:input.targetBank||null,note:String(input.note||'').trim().slice(0,180),reference:null,createdAt:new Date().toISOString(),confirmedAt:null,matchedAt:null};}
 function commit(db,callback){const registry=ensure(db);const snapshot=JSON.stringify(registry);try{const out=callback(registry);verifyInvariants(db);return out}catch(e){db.rk39=JSON.parse(snapshot);throw e}}
 function available(db,p,amount){period(p);positive(amount);const info=monthly(db,p);assert(!info.deficit,'يوجد عجز في هذا الشهر؛ سوّ السجل قبل إضافة عمليات.');assert(info.free>=amount,'الرصيد غير المخصص لهذا الشهر لا يغطي العملية.');}
 function snapshotMonth(db,p,amount,note){
   period(p);positive(amount);
   assert(Array.isArray(db.salaryMonths)&&db.salaryMonths.includes(p),'لا يمكن تثبيت المخصص قبل تسجيل راتب الشهر في دورة الراتب.');
   assert(!read(db).months[p],'سبق تثبيت مخصص هذا الشهر، ولا يجوز تكراره.');
   return commit(db,state=>{
    const record={allocation:amount,confirmedAt:new Date().toISOString(),note:String(note||'').slice(0,180)};
    state.months[p]=record;return record;
   });
 }
 function rollover(db,from,to,amount,note){
   period(from);period(to);assert(to>from,'يجب ترحيل الفائض إلى شهر لاحق.');available(db,from,amount);
   return commit(db,state=>{const e=makeEvent('rollover',{from,to,amount,note},'posted');state.events.push(e);return e;});
 }
 function reserveAdd(db,from,amount,note){
   period(from);available(db,from,amount);const target=reserve(db);
   assert(target.target>0,'حدد الاحتياطي المستهدف أولًا من مخصصات البنوك.');
   assert(amount<=target.gap,'المبلغ يتجاوز الفجوة الحالية للاحتياطي المستهدف.');
   return commit(db,state=>{const e=makeEvent('reserve-add',{from,amount,note},'posted');state.events.push(e);return e;});
 }
 function reserveOpening(db,amount,reference,note){
   positive(amount);
   const target=reserve(db);
   assert(target.target>0,'حدد الاحتياطي المستهدف أولًا.');
   assert(target.earmarked===0&&!read(db).events.some(e=>['reserve-opening','reserve-add','reserve-release'].includes(e.kind)),'لا يجوز تسجيل افتتاحي بعد بدء حركات الاحتياطي.');
   assert(amount<=target.target,'الرصيد الافتتاحي يتجاوز المستهدف الحالي.');
   const ref=String(reference||'').trim();assert(ref.length>=5,'أدخل مرجع مستند الافتتاح أو كشف البنك.');
   return commit(db,state=>{const e=makeEvent('reserve-opening',{amount,note},'posted');e.reference=ref;state.events.push(e);return e;});
 }
 function reserveRelease(db,to,amount,note){
   period(to);positive(amount);assert(reserveBalance(db)>=amount,'الاحتياطي المحجوز غير كافٍ.');
   return commit(db,state=>{const e=makeEvent('reserve-release',{to,amount,note},'posted');state.events.push(e);return e;});
 }
 function requestTransfer(db,from,targetBank,amount,note){
   period(from);assert(Object.prototype.hasOwnProperty.call(BANKS,targetBank),'اختر بنكًا مستفيدًا معروفًا.');available(db,from,amount);
   return commit(db,state=>{const e=makeEvent('bank-transfer',{from,targetBank,amount,note},'pending');state.events.push(e);return e;});
 }
 function getEvent(db,eventId){const e=read(db).events.find(x=>x.id===eventId);assert(!!e,'لم يُعثر على العملية.');return e;}
 function confirmTransfer(db,eventId,reference){
   const e=getEvent(db,eventId);assert(e.kind==='bank-transfer'&&e.status==='pending','هذه العملية ليست طلب تحويل معلّقًا.');
   const ref=String(reference||'').trim();assert(ref.length>=5&&ref.length<=100,'أدخل رقم مرجع التحويل الحقيقي (5 أحرف على الأقل).');
   assert(!read(db).events.some(x=>x.id!==eventId&&x.kind==='bank-transfer'&&['confirmed','matched'].includes(x.status)&&x.reference===ref),'مرجع التحويل مسجل سابقًا.');
   return commit(db,state=>{const dest=state.events.find(x=>x.id===eventId);dest.status='confirmed';dest.reference=ref;dest.confirmedAt=new Date().toISOString();return dest;});
 }
 function cancelTransfer(db,eventId){
   const e=getEvent(db,eventId);assert(e.kind==='bank-transfer'&&e.status==='pending','لا يمكن إلغاء عملية منفذة؛ يجب تصحيحها عبر إجراء مستقل.');
   return commit(db,state=>{const dest=state.events.find(x=>x.id===eventId);dest.status='cancelled';dest.cancelledAt=new Date().toISOString();return dest;});
 }
 function matchTransfer(db,eventId,reference){
   const e=getEvent(db,eventId);assert(e.kind==='bank-transfer'&&e.status==='confirmed','هذه العملية لم تُثبت كتحويل خارجي منفذ.');
   const ref=String(reference||'').trim();assert(ref.length>=5,'أدخل مرجع إثبات الوصول في البنك المستفيد.');
   return commit(db,state=>{const dest=state.events.find(x=>x.id===eventId);dest.status='matched';dest.destinationReference=ref;dest.matchedAt=new Date().toISOString();return dest;});
 }
 function history(db,p){return read(db).events.filter(e=>!p||e.from===p||e.to===p||e.kind==='reserve-opening').slice().reverse();}
 return Object.freeze({BANKS,read,monthly,expense,reserve,history,verifyInvariants,snapshotMonth,rollover,reserveAdd,reserveOpening,reserveRelease,requestTransfer,confirmTransfer,cancelTransfer,matchTransfer});
});
