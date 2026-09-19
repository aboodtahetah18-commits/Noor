import { redirect } from 'next/navigation';
import styles from './preview.module.css';
import { committeeCadence, governanceSections } from '@/lib/governance/namaa-governance-catalog';

export default function PreviewPage(){
  const isPreview=process.env.VERCEL_ENV==='preview'||process.env.APP_ENV==='development';
  if(!isPreview)redirect('/');

  return <main className={styles.page} dir="rtl">
    <header className={styles.topbar}><div><span>معاينة تطبيق نماء</span><strong>الدردشة والحوكمة والاجتماعات</strong></div><b>نسخة معاينة · لا بيانات حقيقية</b></header>
    <section className={styles.hero}><div><small>ما تم تطبيقه في هذه الحزمة</small><h1>محادثة أوضح، قناة عمليات واحدة، وحوكمة مرئية بالكامل</h1><p>هذه الصفحة تعرض شكل التنفيذ على الجوال قبل الدمج للإنتاج. البيانات أدناه تجريبية ولا تمثل حساب مستخدم.</p></div></section>

    <section className={styles.phoneGrid}>
      <article className={styles.phone}>
        <header><span>نماء</span><b>المحادثات</b></header>
        <div className={styles.chatList}>
          {[
            ['محافظ البنك المركزي','بنك نماء المركزي'],
            ['مركز العمليات والمطابقة','رسائل المشتريات والحركات'],
            ['مدير بنك ملاءة','الحماية والاحتياطي'],
            ['مدير بنك الأصول الاستثماري','الأصول والأهداف والاستثمار'],
            ['مدير بنك الهلال','التمويل الداخلي'],
            ['المستشار الاقتصادي','الصورة المالية الكلية'],
            ['أمين السر المركزي','الحوكمة والاجتماعات والمحاضر'],
            ['مجلس نماء الأعلى','القرارات واللجان'],
          ].map(([name,sub],i)=><div key={name} className={i===1?styles.activeChat:''}><i>{name.slice(0,1)}</i><span><strong>{name}</strong><small>{sub}</small></span></div>)}
        </div>
      </article>

      <article className={styles.phone}>
        <header><span>العمليات والمطابقة</span><b>بنك نماء المركزي</b></header>
        <div className={styles.messages}>
          <div className={styles.agent}><small>مركز العمليات والمطابقة</small><p>ألصق رسالة البنك كما وصلتك. سأربطها بالحساب والتاجر وأمنع التكرار، ولن أخمن عند وجود تعارض.</p></div>
          <div className={styles.user}><p>شراء عبر مدى بمبلغ 85 ر.س لدى مقهى...</p></div>
          <div className={styles.agent}><small>المطابقة</small><p>تم توجيه الرسالة وتسجيلها للمراجعة. إذا احتجت تحديد الحساب سأطلبه منك فقط.</p><b>مرجع واحد · لا تكرار</b></div>
        </div>
        <footer>اكتب رسالة شراء أو أرفق إيصالًا…</footer>
      </article>

      <article className={styles.phone}>
        <header><span>أمين السر المركزي</span><b>الحوكمة والاجتماعات</b></header>
        <div className={styles.governancePreview}>
          <section><small>أول اجتماع مجلس</small><strong>بعد 24 ساعة من اعتماد التأسيس</strong><p>فهم المستخدم · احتياجات الخوارزميات · مستوى التدخل · الأسئلة والمتابعة.</p></section>
          {governanceSections.slice(0,5).map(section=><div key={section.id}><span><strong>{section.title}</strong><small>{section.description}</small></span><b>فتح</b></div>)}
        </div>
      </article>
    </section>

    <section className={styles.panel}><header><div><small>التقويم الحوكمي</small><h2>اجتماعات دورية + طوارئ عند الحاجة</h2></div><span>الطارئ لا يلغي الدوري</span></header><div className={styles.schedule}>{committeeCadence.map((item,index)=><article key={item.name}><b>{index+1}</b><div><strong>{item.name}</strong><small>{item.cadence}</small><p>طارئ: {item.emergency}</p></div></article>)}</div></section>

    <section className={styles.panel}><header><div><small>الشفافية</small><h2>السياسات والصلاحيات والمحاضر من الجوال</h2></div><span>عرض كامل + إصدارات</span></header><div className={styles.governanceGrid}>{governanceSections.map(section=><article key={section.id}><strong>{section.title}</strong><p>{section.description}</p><small>{section.items.length} عناصر في معاينة هذا الإصدار</small></article>)}</div></section>
  </main>;
}
