/* ركائز 44 — الاحتياطيات المتغيرة والقدرة على الاستثمار.
   تحليل تلقائي لكل بنك، تسجيل تعديل سياسة الحماية باعتماد المستخدم فقط.
   لا يحدث أي تحويل، قيد محاسبي، بيع أصل أو استثمار تلقائي.
*/
(function(){
 'use strict';
 const adaptive=window.RakaezAdaptiveCore;
 if(!adaptive||typeof reservesView!=='function'||typeof render!=='function'||typeof db==='undefined')return;
 const fmt=v=>money(Math.round(Number(v)||0));
 const safe=v=>esc(String(v??''));
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const infoSvg='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v5m0-8h.01"/></svg>';
 const magnify='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 15 5-5 4 4 5-6"/><path d="M14 8h5v5"/></svg>';
 function bankIcon(id){
  return document.querySelector('#nav [data-rk33-page="'+id+'"] .rk35-bankmark')?.outerHTML||'';
 }
 function hint(text){
  return '<details class="rk44-help"><summary aria-label="عرض شرح الحساب" title="عرض شرح الحساب">'+infoSvg+'</summary><p>'+safe(text)+'</p></details>';
 }
 function tone(value){return value<0?'red':value===0?'navy':'teal';}
 function metric(label,value,color='navy'){
  return '<div class="rk44-metric"><span>'+safe(label)+'</span><strong class="rk44-'+color+'">'+value+'</strong></div>';
 }
 const actions={
  hilal:[['hilal','تغذية أو استخدام الاحتياطي'],['debts','سداد الالتزامات'],['transactions','مراجعة المصروفات']],
  malaa:[['malaa','مراجعة السيولة'],['interbank','طلب تمويل بين البنوك'],['assets','استثمار الفائض بعد الحماية']],
  assets:[['assets','إدارة الاستثمارات'],['research','دراسة الأسهم والشركات'],['malaa','فحص السيولة المتاحة']]
 };
 function bankCard(id,title,subtitle,mainLabel,main,toneMain,info,metrics,year,snapshot){
  const opts=Array.from({length:6},(_,i)=>{
   const count=i+1;return '<option value="'+count+'" '+(snapshot.policy[id]===count?'selected':'')+'>'+count+' '+(count===1?'شهر':'أشهر')+'</option>';
  }).join('');
  return '<article class="rk44-card rk44-'+id+'">'+
   '<header class="rk44-bank-head"><div class="rk44-bank-id">'+bankIcon(id)+
   '<div><h3>'+safe(title)+'</h3><small>'+safe(subtitle)+'</small></div></div>'+
   '<span class="rk44-status '+(id==='assets'?'rk44-neutral':info.gap>0?'rk44-watch':'rk44-good')+'">'+
   (id==='assets'?'استثمار':info.gap>0?'يحتاج تعزيزًا':id==='hilal'?'حجز داخلي مكتمل':'سيولة مسجلة كافية')+'</span></header>'+
   '<div class="rk44-hero"><span>'+safe(mainLabel)+'</span><strong class="rk44-'+toneMain+'">'+main+'</strong>'+
   (year?'<small>'+safe(year)+'</small>':'')+'</div>'+
   '<div class="rk44-metrics">'+metrics.join('')+'</div>'+
   (id!=='assets'?'<div class="rk44-progressrow"><span>تغطية الاحتياطي</span>'+
   '<strong class="rk44-'+(info.gap>0?'red':'teal')+'">'+Math.min(100,Math.max(0,(info.coverage||0)*100)).toFixed(0)+'%</strong></div>'+
   '<div class="rk44-progress" role="progressbar" aria-label="نسبة تغطية الاحتياطي" aria-valuenow="'+Math.min(100,Math.max(0,(info.coverage||0)*100)).toFixed(1)+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+Math.min(100,Math.max(0,(info.coverage||0)*100)).toFixed(1)+'%"></span></div>':'')+
   '<div class="rk44-policy"><label>مدة الحماية <select data-rk44-policy="'+id+'" aria-label="مدة حماية '+safe(title)+'">'+opts+'</select></label>'+
   hint(id==='hilal'?
   'يحسب الهدف من الصرف المتوقع، والأقساط القائمة، وأثر المديونية. المحجوز في سجل الهلال تخصيص إداري وليس رصيدًا مصرفيًا موثقًا.':
   id==='malaa'?
   'تحتسب التغطية من شرائح الادخار التي يمكن الوصول إليها خلال ثلاثة أيام، بعد حجز طلبات السحب المعلقة؛ ولا تعتبر الأرصدة تأكيدًا مباشرًا من البنك.':
   'مدة الحماية في بنك الأصول تضيف هامش أمان سائل قبل اعتبار أي فائض قابلًا للاستثمار. لا تُعامل القيمة السوقية للمحافظ والأسهم كرصيد نقدي فوري، ولا يُنفَّذ شراء أو بيع تلقائيًا.')+'</div>'+
   '<footer class="rk44-actions">'+actions[id].map(([route,label],i)=>'<button type="button" class="'+(i===0?'rk44-primary':'')+'" data-rk44-page="'+route+'">'+safe(label)+'</button>').join('')+'</footer></article>';
 }
 function riskPanel(data){
  const high=data.critical||data.warning;
  const shortage=data.gapToProtection;
  const level=high?'مرتفع':shortage>0?'بحاجة إلى تعزيز':'تحت المتابعة';
  return '<section class="rk44-risk" aria-label="الاستجابة المالية">'+
   '<div class="rk44-risk-title"><div><h3>الاستجابة المبكرة للالتزامات</h3>'+
   '<span class="rk44-risk-badge '+(high?'rk44-danger':shortage>0?'rk44-caution':'rk44-healthy')+'">'+level+'</span></div>'+
   hint('النظام يعيد حساب الضغط المالي كلما تغيرت الأقساط أو المصروفات أو الأرصدة المسجلة. لا يقترض ولا يبيع استثمارات ولا يحول أموالًا دون موافقتك.')+
   '</div>'+
   '<div class="rk44-risk-values">'+
   metric('الأقساط الشهرية القائمة',fmt(data.debtMonthly),'red')+
   metric('عبء الأقساط من الراتب',data.debtRatio===null?'غير محسوب':(data.debtRatio*100).toFixed(1)+'%',high?'red':'navy')+
   metric('العجز عن تغطية السيولة',fmt(shortage),shortage>0?'red':'teal')+'</div>'+
   '<div class="rk44-response">'+
   (high?'<strong class="rk44-red">حالة حماية: عُلّق ترشيح فائض للاستثمار؛ راجع الأقساط والسيولة قبل أي استثمار جديد.</strong>':
   shortage>0?'<strong class="rk44-gold">يلزم تعزيز السيولة قبل زيادة المخاطرة الاستثمارية.</strong>':
   '<strong class="rk44-teal">لا يظهر ضغط مرتفع من الالتزامات المسجلة حاليًا.</strong>')+
   '<div class="rk44-response-actions">'+
   '<button type="button" data-rk44-page="debts">مراجعة الأقساط وسدادها</button>'+
   '<button type="button" data-rk44-release>طلب تفعيل احتياطي الهلال</button>'+
   '<button type="button" data-rk44-page="interbank">التمويل بين البنوك</button></div></div></section>';
 }
 function scenarioPanel(){
  return '<details class="rk44-scenario"><summary>اختبار تأثير قرض جديد على قوة البنوك</summary>'+
   '<form data-rk44-scenario><div class="rk44-scenario-fields">'+
   '<label>مبلغ القرض (ريال)<input name="amount" type="number" inputmode="decimal" min="1" step="0.01" required placeholder="مبلغ القرض المطلوب"></label>'+
   '<label>المدة بالأشهر<input name="term" type="number" min="1" max="600" step="1" required value="36"></label>'+
   '<label>المعدل السنوي %<input name="rate" type="number" min="0" max="100" step="0.01" value="0" required></label></div>'+
   '<button type="submit" class="rk44-simulate">احسب أثر القرض</button></form>'+
   '<div class="rk44-scenario-result" data-rk44-result aria-live="polite"></div></details>';
 }
 function activePeriod(){
  const fn=window.RakaezHilalSelectedPeriod;
  const candidate=typeof month==='string'?month:typeof fn==='function'?fn():null;
  return /^20\d{2}-(0[1-9]|1[0-2])$/.test(String(candidate))?candidate:new Date().toISOString().slice(0,7);
 }
 const previousReserves=reservesView;
 reservesView=function(){
  let data;
  try{data=adaptive.assess(db,activePeriod());}
  catch(err){return previousReserves();}
  const h=data.banks.hilal,m=data.banks.malaa,a=data.banks.assets;
  const hilal=bankCard('hilal','بنك الهلال','التشغيل وامتصاص الأزمات','هدف الحماية المتغير',fmt(h.target),'navy',
   h,[metric('المحجوز داخليًا',fmt(h.recorded),'teal'),
   metric('الفجوة الحالية',fmt(h.gap),h.gap>0?'red':'teal'),
   metric('مدة الحماية',data.policy.hilal+' '+(data.policy.hilal===1?'شهر':'أشهر'),'blue')],null,data);
  const malaa=bankCard('malaa','بنك ملاءة','السيولة والادخار المتاح','احتياطي السيولة المتغير',fmt(m.target),'navy',
   m,[metric('السيولة خلال 3 أيام',fmt(m.recorded),'teal'),
   metric('السيولة الفورية',fmt(m.instant),'blue'),
   metric('نقص التغطية',fmt(m.gap),m.gap>0?'red':'teal')],null,data);
  const assets=bankCard('assets','بنك الأصول','الاستثمارات والقدرة على النمو','قيمة الاستثمارات المسجلة',fmt(a.market),'blue',
   a,[metric('فائض قابل للدراسة الاستثمارية',fmt(a.target),a.target?'teal':'navy'),
   metric('الأصول الاستثمارية',String(data.investment.count),'teal'),
   metric('هامش أمان قبل الاستثمار',fmt(a.safetyBuffer),'gold')],
   'القيمة السوقية ليست رصيدًا فوريًا للسحب',data);
  return '<section class="rk44-screen" aria-label="مركز الحماية والاستثمار">'+
   '<header class="rk44-screen-title"><h2>الاحتياطيات المتغيرة والاستثمار</h2>'+
   hint('يتغير احتياطي الحماية مع المصروفات والأقساط والديون والرسوم المسجلة. الأرصدة مدخلة محليًا، والاستثمارات ليست نقدًا متاحًا فورًا.')+
   '</header>'+
   '<div class="rk44-topline">'+
   metric('الاحتياج الشهري المحسوب',fmt(data.monthlyNeed),'navy')+
   metric('إجمالي الادخار المسجل',fmt(data.savings.total),'teal')+
   metric('فجوة السيولة الوقائية',fmt(data.gapToProtection),data.gapToProtection?'red':'teal')+'</div>'+
   '<div class="rk44-bank-list">'+hilal+malaa+assets+'</div>'+
   riskPanel(data)+scenarioPanel()+
   '<p class="rk44-caution-note">لا تُنفّذ تحويلات أو مشتريات استثمارية تلقائيًا. تُثبت العمليات بعد المراجعة من صفحات البنوك المعنية. وقد تختلف السيولة الفعلية عن الأرصدة المدخلة حتى تتم المطابقة.</p>'+
   '</section>';
 };
 const originalRender=render;
 render=function(){
  const result=originalRender.apply(this,arguments);
  if(['insights','debts','hilal','malaa','assets','position'].includes(page)){
   const root=document.getElementById('view');
   if(root&&!root.querySelector('.rk44-alert-inline')){
    try{
     const data=adaptive.assess(db,activePeriod());
     if(data.critical||data.warning){
      const banner=document.createElement('div');
      banner.className='rk44-alert-inline';
      banner.setAttribute('role','alert');
      banner.innerHTML='<span>تنبيه الحماية: عبء القروض المسجلة '+(data.critical?'حرج':'مرتفع')+
       '؛ أُوقف ترشيح فائض جديد للاستثمار حتى مراجعة السيولة.</span>'+
       '<button type="button" data-rk44-page="reserves">مراجعة الحماية</button>';
      root.prepend(banner);
     }
    }catch(error){/* A bad financial entry must never hide the page. */}
   }
  }
  return result;
 };
 const entry=Array.isArray(N)?N.find(item=>item[0]==='reserves'):null;
 if(entry)entry[1]='الاحتياطيات المتغيرة';
 const bankPosition=Array.isArray(N)?N.find(row=>row[0]==='position'):null;
 if(bankPosition)bankPosition[1]='الوضع المالي للبنوك';
 document.addEventListener('click',event=>{
  const release=event.target.closest('[data-rk44-release]');
  if(release){
   event.preventDefault();event.stopImmediatePropagation();
   const registry=window.RakaezHilalCore;
   const earmarked=registry&&typeof registry.reserve==='function'?registry.reserve(db).earmarked:0;
   navigate('hilal');
   if(earmarked>0){
    const trigger=document.querySelector('#view [data-rk39-open="reserve-release"]');
    if(trigger)trigger.click();
    else alert('افتح عمليات الاحتياطي وسجّل إعادة التخصيص بعد مراجعة المبلغ.');
   }else{
    alert('لم يُسجّل احتياطي محجوز يمكن إعادة تخصيصه. راجع احتياطي الهلال والرصيد الفعلي أولًا.');
   }
   return;
  }
  const button=event.target.closest('[data-rk44-page]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  navigate(button.dataset.rk44Page);
 },true);
 document.addEventListener('change',event=>{
  const selector=event.target.closest('[data-rk44-policy]');
  if(!selector)return;
  const id=selector.dataset.rk44Policy;
  if(!Object.hasOwn(adaptive.defaults,id))return;
  const n=Number(selector.value);
  if(!Number.isInteger(n)||n<1||n>6){alert('مدة حماية غير صالحة.');render();return;}
  const prior=db.rk44Policy?{...db.rk44Policy}:undefined;
  const previousAudit=Array.isArray(db.audit)?db.audit.slice():null;
  const p=adaptive.monthsPolicy(db);
  db.rk44Policy={...p,[id]:n};
  try{
   audit('تحديث سياسة الحماية',id+' — '+n+' أشهر');
   save();
   render();
   if(typeof toast==='function')toast('حُفظت مدة الحماية وأُعيد الحساب');
  }catch(err){
   if(prior)db.rk44Policy=prior;
   else delete db.rk44Policy;
   if(previousAudit!==null)db.audit=previousAudit;
   else delete db.audit;
   alert('تعذر حفظ السياسة. لم يعتمد التعديل.');
   render();
  }
 },true);
 document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-rk44-scenario]');
  if(!form)return;
  event.preventDefault();event.stopImmediatePropagation();
  const output=form.parentElement.querySelector('[data-rk44-result]');
  if(!output)return;
  try{
   const amount=Number(form.elements.namedItem('amount').value);
   const months=Number(form.elements.namedItem('term').value);
   const rate=Number(form.elements.namedItem('rate').value);
   if(!Number.isFinite(amount)||amount<=0||amount>1e9)throw Error('أدخل مبلغًا صالحًا للقرض.');
   const r=adaptive.scenario(db,activePeriod(),amount,months,rate);
   output.innerHTML='<div class="rk44-stress-result">'+
    metric('القسط الشهري التقديري',fmt(r.monthly),'red')+
    metric('زيادة الاحتياطي المطلوب',fmt(r.increase),'gold')+
    metric('ضغط الأقساط بعد القرض',r.debtRatio===null?'غير محسوب':(r.debtRatio*100).toFixed(1)+'%',r.debtRatio>=0.35?'red':'navy')+
    '</div><p>هذا اختبار افتراضي فقط. لا يسجل قرضًا، ولا يحتسب رسومًا غير مدخلة أو يوافق على التمويل تلقائيًا.</p>'+
    '<button type="button" data-rk44-page="debts">الانتقال إلى إدارة الالتزامات</button>';
  }catch(err){
   output.textContent=err.message||'تعذّر حساب أثر القرض.';
  }
 },true);
 render();
})();