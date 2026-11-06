/* Rakaez v33 — three intentional navigation tiers and a built-in Arabic usage guide.
   Read-only help and navigation only; no mutation of financial data. */
(function () {
'use strict';
if (typeof N === 'undefined' || typeof page === 'undefined' || typeof drawNav !== 'function' || typeof render !== 'function') return;

const navGroups = [
 {id:'daily',title:'الأكثر استخدامًا',hint:'المهام اليومية',ids:['insights','hilal','malaa','assets','transactions','spending']},
 {id:'periodic',title:'المتابعة الدورية',hint:'شهريًا وعند الحاجة',ids:['cycles','goals','scheduled','receivables','debts','fees','funding','interbank','reserves','externalBanks','spending-followups']},
 {id:'reference',title:'التحليل والمراجع',hint:'للمراجعة والرجوع',ids:['intelligence','research','position','ledger','reports','documents','import','settings','guide']}
];
if (!N.some(item=>item[0]==='guide')) N.push(['guide','دليل استخدام ركائز','help']);
const guideLabels=Object.fromEntries(N.map(x=>[x[0],x[1]]));
const navState={daily:true,periodic:false,reference:false};
const escapeText=value=>typeof esc==='function'?esc(String(value??'')):String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let helpSearch='';

function groupIdFor(id){return navGroups.find(g=>g.ids.includes(id))?.id || 'reference'}
drawNav=function(){
 const nav=document.getElementById('nav');
 if(!nav)return;
 nav.classList.add('rakaez-nav-flat','rk33-navigation');
 nav.setAttribute('aria-label','القائمة الجانبية الرئيسية');
 navState[groupIdFor(page)]=true;
 const defined=new Set(navGroups.flatMap(g=>g.ids));
 const overflow=N.map(item=>item[0]).filter(id=>!defined.has(id));
 const groups=navGroups.map(g=>({...g,ids:g.id==='reference'?[...g.ids,...overflow]:g.ids}));
 nav.innerHTML=groups.map(g=>{
  const links=g.ids.map(id=>N.find(n=>n[0]===id)).filter(Boolean);
  const opened=navState[g.id];
  return '<section class="rk33-nav-group">'+
   '<button type="button" class="rk33-nav-heading" data-rk33-toggle="'+g.id+'" aria-expanded="'+opened+'" aria-controls="rk33-links-'+g.id+'">'+
    '<span class="rk33-nav-heading-title">'+escapeText(g.title)+'</span>'+
    '<small>'+escapeText(g.hint)+'</small><span class="rk33-nav-chevron" aria-hidden="true"></span>'+
   '</button>'+
   '<div class="rk33-nav-links" id="rk33-links-'+g.id+'" '+(opened?'':'hidden')+'>'+
   links.map(n=>{
     const active=(page===n[0]);
     return '<button type="button" class="rk33-nav-link '+(active?'active':'')+'" data-rk33-page="'+escapeText(n[0])+'" aria-current="'+(active?'page':'false')+'">'+
      '<span class="rakaez-nav-icon" aria-hidden="true">'+ico(n[2])+'</span>'+
      '<span class="rakaez-nav-name">'+escapeText(n[1])+'</span></button>';
   }).join('')+'</div></section>';
 }).join('');
};

const topics=[
 {id:'insights',summary:'المؤشرات الأساسية والنتائج الإجمالية في مكان واحد.',steps:['افتح الرئيسية لمشاهدة أهم مؤشرات المنصة المجمّعة.','راجع تغيرات الدخل والمصروف والالتزامات والادخار حسب البيانات المدخلة.','انتقل إلى القسم المعني إذا احتجت إلى تفاصيل أي مؤشر.'],tip:'المؤشرات تعكس السجلات المسجلة ولا تُعد كشف حساب بنكيًا.'},
 {id:'hilal',summary:'إدارة البنود التشغيلية والمخصصات والمصروفات.',steps:['افتح بنك الهلال ثم استعرض البنود التشغيلية.','حدد بندًا للاطلاع على مخصصه ومصروفاته والفرق بينهما.','سجل المصروفات في المعاملات المالية، واستخدم طلبات التمويل عند الحاجة.'],tip:'المخصص ليس رصيدًا مصرفيًا إضافيًا؛ تابع المصروفات الفعلية دائمًا.'},
 {id:'malaa',summary:'شرائح الادخار والرصيد وطلبات السحب.',steps:['افتح بنك ملاءة وراجع الشرائح الادخارية المتاحة.','سجل النقل إلى الشريحة المناسبة أو طلب السحب من أدوات البنك.','راجع تاريخ الإتاحة وحالة الطلب قبل اتخاذ قرار مالي.'],tip:'أيام إتاحة السحب المعروضة تقديرية وليست تنفيذًا بنكيًا.'},
 {id:'assets',summary:'المحافظ والأصول وفرص الاستثمار قيد الدراسة.',steps:['افتح بنك الأصول وأضف المحفظة أو الأصل بنوعه الصحيح.','أدخل المدفوعات والقيمة السوقية من آخر كشف موثوق، وحدد توزيع الأصول.','راجع التوزيعات والفرص ودراسة المخاطر في تفاصيل كل أصل.'],tip:'العائد المتوقع لا يساوي القيمة السوقية الفعلية ولا يُستخدم بدل آخر كشف.'},
 {id:'transactions',summary:'تسجيل الدخل والمصروف والحركات المالية.',steps:['اختر إضافة معاملة ثم أدخل التاريخ والوصف.','حدد نوع الحركة والبند المالي والمبلغ بدقة.','راجع البيانات واحفظها، ثم تحقق من ظهورها في السجل.'],tip:'تحقق من نوع العملية حتى لا يُحتسب المصروف ضمن الدخل أو العكس.'},
 {id:'spending',summary:'مراقبة كفاءة الإنفاق والانحرافات.',steps:['افتح كفاءة الإنفاق لاستعراض الملاحظات على الحركات المسجلة.','افتح أي حالة لمراجعة أسباب تجاوز الميزانية أو تغير الإنفاق.','سجل إجراء المتابعة وراجع أثره في صفحة متابعة الإجراءات.'],tip:'التوصيات مبنية على السجلات الحالية، وتحتاج إلى مراجعة بشرية قبل التنفيذ.'},
 {id:'cycles',summary:'إعداد دورة الراتب وتوزيع مخصصات الشهر.',steps:['اختر دورة جديدة وحدد الشهر المطلوب من نافذة المنصة.','راجع تسوية البنود السابقة والالتزامات والتوزيع المقترح.','احفظ المسودة، ثم اعتمد الدورة بعد التأكد من القيم.'],tip:'اعتماد خطة الدورة لا ينفذ تحويلًا أو خصمًا مصرفيًا تلقائيًا.'},
 {id:'goals',summary:'إنشاء الأهداف ومتابعة التقدم في الادخار.',steps:['أضف هدفًا باسم واضح ومبلغ مستهدف وموعد مناسب.','سجل المبلغ المخصص فعليًا للهدف عند حدوثه.','تابع نسبة الإنجاز والمتبقي من البطاقة أو التفاصيل.'],tip:'قيمة الهدف هي غاية تخطيطية وليست أصلًا متاحًا في الرصيد.'},
 {id:'scheduled',summary:'تذكير دوري بالعمليات والتحويلات المخططة.',steps:['اختر إضافة عملية مجدولة وأدخل عنوانها ونوعها.','حدد المبلغ الثابت أو النسبة والدورية وتاريخ أول استحقاق.','راجع الحالة، وأوقف العملية مؤقتًا أو استأنفها من التفاصيل.'],tip:'الجدولة لا تنفذ المعاملة تلقائيًا داخل حسابك المصرفي.'},
 {id:'receivables',summary:'المبالغ المستحقة لك والتحصيل الجزئي.',steps:['أضف المبلغ المستحق مع الجهة وأصل المبلغ وتاريخ الاستحقاق.','افتح تفاصيل المستحق وسجل كل تحصيل فعلي بمبلغه وتاريخه.','راجع أصل المستحق والمحصّل والمتبقي لتجنب الازدواج.'],tip:'سجل التحصيل لا يُرحَّل تلقائيًا إلى دفتر الأستاذ أو البنك.'},
 {id:'debts',summary:'الالتزامات والأقساط والمتبقي من الأصل.',steps:['أضف الالتزام وأدخل أصله والقسط والموعد والمعدل إن وجد.','حدّث المدفوعات وفق ما سُدد فعليًا.','تابع المتبقي ونسبة السداد وتاريخ الاستحقاق.'],tip:'تميّز مبالغ الالتزامات عن أرقام الادخار والدخل.'},
 {id:'fees',summary:'الاشتراكات والرسوم المتكررة.',steps:['أضف اسم الرسم والجهة المرتبطة به وقيمته.','حدد دورية الرسم وتاريخ استحقاقه.','راجع المبالغ المتوقعة قبل وقت السداد.'],tip:'إضافة رسم دوري للتخطيط لا تثبت دفعه فعليًا.'},
 {id:'funding',summary:'عقود التمويل الإداري بين المراكز.',steps:['اختر إضافة عقد وحدد المركز الممول والمركز المستفيد.','حدد البند وأصل التمويل والمعدل والمدة ثم احفظ العقد.','راجع المتبقي وسجل سداد الأصل عند حدوثه فعليًا.'],tip:'التمويل الداخلي إداري ولا يخلق سيولة جديدة أو يُنفذ قرضًا مصرفيًا.'},
 {id:'interbank',summary:'طلبات التمويل المقترحة بين المراكز.',steps:['اختر طلبًا جديدًا وحدد الجهة المقرضة والمستفيدة.','أدخل الأصل والمعدل والمدة وراجع التكلفة التقديرية.','استخدم السجل لدراسة الطلب قبل أي تنفيذ خارجي.'],tip:'إنشاء الطلب لا يسحب أو يودع الأموال في أي بنك.'},
 {id:'reserves',summary:'تحديد الاحتياطيات المستهدفة لكل مركز.',steps:['افتح بنوك المنصة واستعرض مخصص الهلال وملاءة والأصول.','عدل المستهدف لكل مركز بناء على احتياجاتك.','قارن المستهدف بالقيم الفعلية من المركز المالي الموحد.'],tip:'الاحتياطي المستهدف هدف تخطيطي ولا يعني وجود نقد بنفس القيمة.'},
 {id:'externalBanks',summary:'تسجيل حسابات البنوك الخارجية للمتابعة.',steps:['أضف بنكًا خارجيًا وحدد معلومات الحساب المرجعية.','افتح البطاقة لمراجعة بيانات البنك أو تحديثها.','تابع الحساب باعتباره سجلًا مرجعيًا منفصلًا عن تنفيذ العمليات.'],tip:'لا يتم الربط تلقائيًا بالحسابات المصرفية.'},
 {id:'spending-followups',summary:'متابعة الإجراءات بعد اكتشاف انحراف مالي.',steps:['افتح متابعة الإجراءات بعد التنفيذ.','راجع الحالة وما اتخذ من إجراء والنتيجة المنتظرة.','حدّث المتابعة حتى يثبت أثر الإجراء أو يحتاج إلى تعديل.'],tip:'مراجعة النتيجة أهم من الاكتفاء بتسجيل الإجراء.'},
 {id:'intelligence',summary:'تنبيهات وتوصيات مستندة إلى السجلات.',steps:['افتح مركز ذكاء ركائز لقراءة التنبيهات والتوصيات.','افتح التنبيه للاطلاع على مصدره وقيمته أو النسبة المرتبطة به.','تحقق من البيانات قبل تعديل أي خطة أو التزام.'],tip:'التوصيات مؤشرات للمساعدة وليست قرارات مالية آلية.'},
 {id:'research',summary:'ملفات الشركات والتحليل الأولي للاستثمار.',steps:['أضف شركة أو أصلًا للدراسة مع السوق والقطاع والبيانات المتاحة.','استخدم البحث والتصفية للعثور على الشركات.','افتح تفاصيل الشركة وقارن المؤشرات قبل اتخاذ القرار.'],tip:'الأسعار والبيانات مدخلة وليست تحديثًا حيًا من السوق.'},
 {id:'position',summary:'مقارنة أوضاع المراكز المالية المختلفة.',steps:['افتح المركز المالي الموحد لعرض بيانات كل بنك أو مركز.','راجع المخصصات والأرصدة والاستثمارات والالتزامات كلًا بحسب طبيعته.','انتقل إلى البنك المعني لمراجعة تفاصيل الرقم ومصدره.'],tip:'لا تُجمع الأهداف التخطيطية والاستثمارات والسيولة في رصيد نقدي واحد.'},
 {id:'ledger',summary:'القيود المزدوجة والمدين والدائن والمطابقة.',steps:['افتح دفتر الأستاذ وراجع التاريخ والبيان والحسابات المدينة والدائنة.','سجل الحركة أو الرصيد الافتتاحي عند الحاجة، ثم تحقق من توازن طرفي القيد.','استخدم المطابقة أو تصدير السجل، وعكس القيد عند ضرورة التصحيح.'],tip:'عكس القيد يُنشئ معالجة محاسبية عكسية؛ لا يعتبر مجرد إخفاء لسطر سابق.'},
 {id:'reports',summary:'قراءة النتائج والتكاليف والتقارير الدورية.',steps:['افتح التقارير والتحليلات وراجع الشهر المحدد.','قارن المخصصات بالمصروفات والانحرافات المسجلة.','صدّر التقرير أو اطبعه بعد مطابقة الأرقام مع المستندات.'],tip:'لا تعتمد التقرير ككشف مصرفي رسمي دون المطابقة.'},
 {id:'documents',summary:'حفظ المرفقات والملفات المرتبطة بالسجلات.',steps:['اختر إضافة مستند وحدد اسمه وتصنيفه وتاريخه.','اختر ملفًا صالحًا واربطه بالسجل المعني إن لزم.','افتح المستند لاحقًا من التفاصيل لاستعراض بياناته أو فتح مرفقه.'],tip:'المرفقات محفوظة محليًا على الجهاز؛ احتفظ بنسخة مستقلة من ملفاتك المهمة.'},
 {id:'import',summary:'إدخال معاملات من ملف أو رسالة نصية.',steps:['اختر ملف معاملات أو الصق رسالة مصرفية بعد حذف البيانات الحساسة.','افحص المعاينة وتأكد من التاريخ والمبلغ ونوع الحركة والتصنيف.','اعتمد ما راجعته فقط، ثم تحقق من ظهوره في السجل.'],tip:'الاستيراد المحلي لا يتصل بالبنك ولا يقرأ رسائل الهاتف تلقائيًا.'},
 {id:'settings',summary:'ضبط التوزيع والميزانيات وحفظ البيانات.',steps:['راجع الراتب ونسب التوزيع بين المراكز.','ضبط ميزانيات البنود قبل بدء دورة جديدة.','أنشئ نسخة احتياطية من بيانات المنصة قبل التعديلات الكبيرة.'],tip:'بيانات النسخة التجريبية محلية؛ لا تحفظ فيها بيانات مصرفية سرية.'}
];

const topicsById=Object.fromEntries(topics.map(topic=>[topic.id,topic]));
function topicHTML(topic){
 const group=groupIdFor(topic.id);
 return '<details class="rk33-guide-topic" data-rk33-topic="'+escapeText(topic.id)+'" data-rk33-keywords="'+escapeText([guideLabels[topic.id]||topic.id,topic.summary,...topic.steps,topic.tip].join(' '))+'">'+
  '<summary><span>'+escapeText(guideLabels[topic.id]||topic.id)+'</span><small>'+escapeText(topic.summary)+'</small></summary>'+
  '<div class="rk33-guide-details"><ol>'+topic.steps.map(step=>'<li>'+escapeText(step)+'</li>').join('')+'</ol>'+
  '<p class="rk33-guide-tip"><strong>تنبيه مهم:</strong> '+escapeText(topic.tip)+'</p>'+
  '<button type="button" class="rk33-guide-open" data-rk33-page="'+escapeText(topic.id)+'">فتح القسم</button>'+
  '</div></details>';
}
function guideView(){
 const sections=navGroups.map(group=>{
  const subset=group.ids.filter(id=>topicsById[id]);
  return '<section class="rk33-guide-section" data-rk33-guide-group="'+group.id+'">'+
   '<header><h3>'+escapeText(group.title)+'</h3><p>'+escapeText(group.hint)+'</p></header>'+
   '<div class="rk33-guide-topics">'+subset.map(id=>topicHTML(topicsById[id])).join('')+'</div>'+
   '</section>';
 }).join('');
 return '<main class="rk33-guide" aria-label="دليل استخدام منظومة ركائز">'+
  '<header class="rk33-guide-intro"><div class="rk33-guide-eyebrow">مرجع الاستخدام</div>'+
  '<h2>دليل استخدام ركائز</h2>'+
  '<p>تعرف على وظيفة كل قسم وكيف تبدأ العمل فيه. الشرح مرتب مثل القائمة الجانبية، مع إمكانية الوصول مباشرة إلى الصفحة المعنية.</p></header>'+
  '<section class="rk33-guide-start" aria-label="خطوات البداية"><h3>البداية الموصى بها</h3>'+
  '<ol><li>راجع الراتب ونسب التوزيع من الإعدادات.</li>'+
  '<li>تحقق من البنود التشغيلية والأهداف المالية.</li>'+
  '<li>سجل المعاملات الفعلية وتابع كفاءة الإنفاق.</li>'+
  '<li>راجع دورة الراتب والالتزامات قبل الاعتماد.</li>'+
  '<li>راجع المركز المالي والتقارير عند الحاجة.</li></ol></section>'+
  '<div class="rk33-guide-search"><label for="rk33GuideSearch">البحث في شروحات النظام</label>'+
   '<input type="search" id="rk33GuideSearch" value="'+escapeText(helpSearch)+'" placeholder="اكتب اسم صفحة أو إجراء..." autocomplete="off"/>'+
   '<span id="rk33GuideCount" aria-live="polite"></span></div>'+
   '<div class="rk33-guide-groups">'+sections+'</div>'+
   '<p class="rk33-guide-footer">هذا الدليل يشرح الوظائف الحالية للنسخة التجريبية. البيانات محفوظة على هذا الجهاز، ولا تنفذ المنصة تحويلات مصرفية تلقائيًا.</p>'+
  '</main>';
}
function applyHelpSearch(){
 const input=document.getElementById('rk33GuideSearch');
 if(!input)return;
 const q=helpSearch.trim().toLocaleLowerCase('ar');
 let visible=0;
 document.querySelectorAll('#view [data-rk33-topic]').forEach(el=>{
  const matches=!q||String(el.dataset.rk33Keywords||'').toLocaleLowerCase('ar').includes(q);
  el.hidden=!matches;
  if(matches)visible++;
 });
 document.querySelectorAll('#view [data-rk33-guide-group]').forEach(group=>{
  group.hidden=![...group.querySelectorAll('[data-rk33-topic]')].some(x=>!x.hidden);
 });
 const count=document.getElementById('rk33GuideCount');
 if(count)count.textContent=visible?'عدد الشروحات: '+visible:'لا توجد شروحات مطابقة.';
}
const previousRender=render;
render=function(){
 const result=previousRender.apply(this,arguments);
 if(page==='guide'){
  const view=document.getElementById('view');
  if(view){view.innerHTML=guideView();view.dataset.v33Page='guide';}
  const title=document.getElementById('pageTitle');
  if(title)title.textContent='دليل استخدام ركائز';
  const sub=document.getElementById('pageSub');
  if(sub)sub.textContent='الشرح العملي لوظائف المنصة';
  applyHelpSearch();
 }
 return result;
};
document.addEventListener('click',event=>{
 const toggle=event.target.closest('[data-rk33-toggle]');
 if(toggle){
  event.preventDefault();
  const id=toggle.dataset.rk33Toggle;
  if(!(id in navState))return;
  navState[id]=!navState[id];
  drawNav();
  return;
 }
 const go=event.target.closest('[data-rk33-page]');
 if(go){
  event.preventDefault();
  const id=go.dataset.rk33Page;
  if(!N.some(x=>x[0]===id))return;
  navState[groupIdFor(id)]=true;
  navigate(id);
 }
});
document.addEventListener('input',event=>{
 if(event.target.id!=='rk33GuideSearch')return;
 helpSearch=event.target.value;
 applyHelpSearch();
});
drawNav();
})();
