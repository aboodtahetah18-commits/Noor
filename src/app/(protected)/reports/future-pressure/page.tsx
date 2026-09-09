import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getPressureDecisionScenarios } from '@/features/future-pressure/queries/get-pressure-decision-scenarios';
import { formatSar } from '@/lib/format-money';
import { formatFinancialDateTime } from '@/lib/format-date';
import { WorkflowStageGuide } from '@/components/ux/workflow-stage-guide';
import { getPressureDecisionPackages } from '@/features/future-pressure/queries/get-pressure-decision-packages';
import { getPressureDecisionLearning } from '@/features/future-pressure/queries/get-pressure-decision-learning';
import { approveCompositePressurePackageAction, cancelCompositePressurePackageAction, createCompositePressurePackageAction, evaluateCompositePressurePackageOutcomeAction, refreshCompositePressurePackageExecutionAction } from './actions';

function money(value: string | number) { return formatSar(typeof value === 'number' ? value.toFixed(2) : value); }
function date(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); }
function outcomeLabel(value: string | null) { return value === 'RESOLVED' ? 'تم حل الضغط فعليًا' : value === 'REDUCED' ? 'انخفض الضغط فعليًا' : value === 'SHIFTED' ? 'انتقل الضغط إلى دورة لاحقة' : value === 'UNCHANGED' ? 'لم يتغير الضغط' : value === 'WORSENED' ? 'زاد الضغط بعد التنفيذ' : value === 'MIXED' ? 'نتيجة مختلطة' : 'لم تُقيّم النتيجة بعد'; }

export default async function FuturePressurePage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const user = await requireAuthenticatedUser();
  const params = searchParams ? await searchParams : {};
  const [decision, packages, decisionLearning] = await Promise.all([getPressureDecisionScenarios(user.id, 6), getPressureDecisionPackages(user.id, 8), getPressureDecisionLearning(user.id)]);
  const forecast = decision?.forecast ?? null;
  if (!forecast) return <main className="app-page p47-pressure-page" dir="rtl"><div className="page-shell p47-analysis-shell"><section className="empty-state"><h1>التوقع المالي المستقبلي</h1><p>لا توجد دورة مالية نشطة لبناء التوقع.</p><Link className="primary-link" href="/cycles/new">بدء دورة مالية</Link></section></div></main>;

  return <main className="app-page p47-pressure-page" dir="rtl"><div className="page-shell p47-analysis-shell">
    <header className="p47-analysis-header"><div><p className="eyebrow">التحليل المستقبلي</p><div className="title-with-help"><h1>رادار الضغط المالي القادم</h1></div></div><Link className="secondary-link" href="/reports">العودة للتقارير</Link></header>

    <WorkflowStageGuide ariaLabel="مراحل قراءة الضغط المالي" stages={[
      {label:'1. قراءة الضغط',description:'افهم موضع العجز والفجوات أولًا',state:'current'},
      {label:'2. مقارنة السيناريوهات',description:'قارن الأثر قبل أي قرار'},
      {label:'3. بناء الحزمة',description:'اجمع الإجراءات التي تريد مراجعتها'},
      {label:'4. الاعتماد والتنفيذ',description:'اعتمد ثم تحقق من التنفيذ الفعلي'},
      {label:'5. قياس النتيجة',description:'أعد قراءة الضغط بعد التنفيذ'},
    ]}/>

    <section className="p47-analysis-kpis">
      <article className="card"><span className="muted">الدخل المرجعي لكل دورة</span><strong>{forecast.baselineExpectedIncome == null ? 'غير متوفر' : money(forecast.baselineExpectedIncome)}</strong></article>
      <article className="card"><span className="muted">أول عجز في الالتزامات المحسوبة</span><strong>{forecast.firstCommittedDeficit ? `${forecast.firstCommittedDeficit.label} · ${money(forecast.firstCommittedDeficit.amount)}` : 'لا يوجد ضمن الأفق'}</strong></article>
      <article className="card"><span className="muted">أول فجوة تمويل رحلة</span><strong>{forecast.firstTripFundingGap ? `${forecast.firstTripFundingGap.label} · ${money(forecast.firstTripFundingGap.amount)}` : 'لا توجد ضمن الأفق'}</strong></article>
      <article className="card"><span className="muted">أفق القراءة</span><strong>{forecast.horizonCycles} دورات</strong></article>
    </section>

    {(forecast.missingTripBudgetCount || forecast.missingTripDateCount) ? <section className="p47-analysis-card"><strong>بيانات رحلات تحتاج استكمالًا</strong><p className="muted">{forecast.missingTripBudgetCount} بدون ميزانية و{forecast.missingTripDateCount} بدون تاريخ. لا تدخل هذه الرحلات في ضغط المواعيد حتى تكتمل بياناتها.</p></section> : null}

    <details className="ux-progressive-disclosure"><summary>تفاصيل الدورات المتوقعة</summary><div className="ux-progressive-disclosure__content"><section className="p47-analysis-card"><div className="section-title-row"><div><h2>الدورات المتوقعة</h2></div></div>
      <div className="dashboard-list">{forecast.cycles.map(c => <div key={c.cycleIndex} className="form-card"><div className="section-title-row"><div><strong>{c.label} · {date(c.windowStart)} → {date(c.windowEnd)}</strong><span>{c.status === 'COMMITTED_DEFICIT' ? 'عجز مؤكد بالقيم المرجعية' : c.status === 'TRIP_FUNDING_GAP' ? 'يوجد موعد رحلة غير ممول بالكامل' : 'لا يوجد عجز محسوب'}</span></div>{c.capacityAfterCommittedOutflow == null ? <strong>لا يوجد دخل مرجعي</strong> : <strong>{money(c.capacityAfterCommittedOutflow)} بعد الالتزامات المحسوبة</strong>}</div>
        <section className="statement-kpis"><div><span>الالتزامات</span><strong>{money(c.obligationAmount)}</strong></div><div><span>الاسترداد</span><strong>{money(c.recoveryAmount)}</strong><small>أصل {money(c.recoveryPrincipalAmount)} + زيادة {money(c.recoveryGrowthAmount)}</small></div><div><span>مساهمات الأهداف</span><strong>{money(c.goalContributionAmount)}</strong></div><div><span>إجمالي الالتزامات المحسوبة</span><strong>{money(c.committedOutflow)}</strong></div><div><span>فجوات الرحلات عند الموعد</span><strong>{money(c.tripDeadlineUncoveredAmount)}</strong><small>بعد حجوزات {money(c.tripDeadlineReservedAmount)}</small></div></section>
        {c.obligations.length ? <div><h3>الالتزامات</h3>{c.obligations.map(o => <p key={o.id} className="muted">{o.name} · {money(o.amount)} · {date(o.dueDate)}{o.source === 'PROJECTED_RECURRENCE' ? ' · متوقع من التكرار' : ''}</p>)}</div> : null}
        {c.recoveries.length ? <div><h3>الاسترداد الداخلي</h3>{c.recoveries.map((r, i) => <p key={`${r.caseTitle}-${r.installmentNumber}-${i}`} className="muted">{r.sourceType === 'EMERGENCY' ? 'الطوارئ' : 'الاستثمار'} · {r.caseTitle} · دفعة {r.installmentNumber} · {money(r.totalAmount)}{r.dueState === 'OVERDUE' ? ' · متأخرة' : ''}</p>)}</div> : null}
        {c.goalContributions.length ? <div><h3>مساهمات الأهداف — إذا استمرت القيم الحالية</h3>{c.goalContributions.map(g => <p key={g.goalId} className="muted"><Link href={`/goals/${g.goalId}`}>{g.goalName}</Link> · {money(g.amount)}</p>)}</div> : null}
        {c.trips.length ? <div><h3>مواعيد الرحلات</h3>{c.trips.map(t => <p key={t.eventId} className="muted"><Link href={`/goals/${t.goalId}?event=${t.eventId}`}>{t.title}</Link> · الاحتياج {money(t.targetAmount)} · المحجوز {money(t.reservedAmount)} · غير المغطى {money(t.uncoveredAmount)}</p>)}</div> : null}
      </div>)}</div>
    </section></div></details>

    {typeof params.error === 'string' ? <section className="p47-analysis-card"><strong>تعذر تنفيذ الإجراء</strong><p className="muted">{params.error}</p></section> : null}
    {typeof params.packageCreated === 'string' ? <section className="p47-analysis-card"><strong>تم إنشاء حزمة قرار مركبة كمسودة.</strong><p className="muted">راجع أثر الحزمة أدناه قبل اعتمادها.</p></section> : null}
    {typeof params.packageApproved === 'string' ? <section className="p47-analysis-card"><strong>تم اعتماد حزمة القرار.</strong><p className="muted">الاعتماد لا ينفذ التغييرات المالية مباشرة؛ أصبح كل إجراء جاهزًا لمساره التنفيذي الصحيح.</p></section> : null}{typeof params.packageSynced === 'string' ? <section className="p47-analysis-card"><strong>تم التحقق من التنفيذ الفعلي.</strong><p className="muted">العناصر المتحققة فعليًا: {params.packageSynced}. تتغير حالة الحزمة وفق الواقع، لا وفق الضغط على الزر.</p></section> : null}{typeof params.packageEvaluated === 'string' ? <section className="p47-analysis-card"><strong>تمت إعادة قراءة الضغط بعد التنفيذ.</strong><p className="muted">حُفظت نتيجة ما تحقق فعليًا ومقارنتها مع الأثر المتوقع للحزمة.</p></section> : null}

    <section className="p47-analysis-card"><div className="section-title-row"><div><h2>سيناريوهات القرار قبل التنفيذ</h2></div></div>
      {!decision?.targetCycleLabel ? <p className="muted">لا يوجد ضغط يحتاج سيناريو معالجة ضمن الأفق الحالي.</p> : <>
        <p className="muted">موضع المقارنة: <strong>{decision.targetCycleLabel}</strong> · الرصيد المرن غير المصروف في الدورة الحالية: {money(decision.flexibleHeadroomCurrentCycle)}</p>
        <form action={createCompositePressurePackageAction}>
          <div className="dashboard-list">{decision.scenarios.map(s => <article className="form-card p47-scenario-card" key={s.id}><div className="section-title-row"><div><strong>{s.recommendationOrder === 1 ? 'الأعلى ترتيبًا الآن · ' : `الترتيب ${s.recommendationOrder ?? '—'} · `}{s.title}</strong><span>{s.description}</span></div><strong>{money(s.amount)}</strong></div>
            {s.learningEvidence ? <div><p className="muted"><strong>سبب الترتيب:</strong> {s.timingShiftOnly ? 'هذا الخيار ينقل التوقيت ولا يحل الفجوة ماليًا؛ لذلك يبقى بعد البدائل ذات التخفيف المباشر. ' : ''}{s.learningEvidence.explanation}</p><small className="muted">الدليل التاريخي: {s.learningEvidence.observations} ملاحظة · الإسناد: مشاركة داخل حزمة مركبة، وليس سببية منفردة.</small></div> : null}
            <label className="muted"><input type="checkbox" name="scenarioId" value={s.id}/> إضافة هذا الإجراء إلى الحزمة المركبة</label>
            <section className="statement-kpis"><div><span>العجز الالتزامي قبل</span><strong>{money(s.committedDeficitBefore)}</strong></div><div><span>تخفيف العجز الالتزامي</span><strong>{money(s.committedDeficitRelief)}</strong></div><div><span>العجز الالتزامي بعد</span><strong>{money(s.committedDeficitAfter)}</strong></div><div><span>فجوة الرحلة قبل</span><strong>{money(s.tripGapBefore)}</strong></div><div><span>{s.timingShiftOnly ? 'الفجوة المنقولة من الموعد الحالي' : 'تخفيف فجوة الرحلة'}</span><strong>{money(s.tripGapReliefAtCurrentDeadline)}</strong></div><div><span>فجوة الموعد الحالي بعد</span><strong>{money(s.tripGapAfterAtCurrentDeadline)}</strong></div></section>
            <p className="muted"><strong>الأثر الجانبي:</strong> {s.sideEffect}</p>
            {s.assumptions.length ? <ul>{s.assumptions.map((a,i)=><li className="muted" key={`${s.id}-a-${i}`}>{a}</li>)}</ul> : null}
            <Link className="secondary-link" href={s.approvalPath}>{s.approvalLabel}</Link>
          </article>)}</div>
          {decision.scenarios.length >= 2 ? <button className="primary-button" type="submit">بناء حزمة مركبة من الاختيارات</button> : null}
        </form>
        {!decision.scenarios.length ? <p className="muted">يوجد ضغط، لكن لا يوجد بديل قابل للحساب من البيانات الحالية دون اختراع افتراض مالي جديد.</p> : null}
      </>}
    </section>


    <details className="ux-progressive-disclosure p75-secondary-section"><summary>حزم القرار المركبة</summary><div className="ux-progressive-disclosure__content"><section className="p47-analysis-card"><div className="section-title-row"><h2>حزم القرار المركبة</h2></div>
      {!packages.length ? <p className="muted">لم تُنشأ حزمة مركبة بعد.</p> : <div className="dashboard-list">{packages.map(pkg => <article className="form-card p47-package-card" key={pkg.id}>
        <div className="section-title-row"><div><strong>{pkg.targetCycleLabel}</strong><span>{pkg.status === 'DRAFT' ? 'مسودة تحتاج مراجعة' : pkg.status === 'APPROVED' ? 'معتمدة وجاهزة لمسارات التنفيذ' : pkg.status === 'CANCELLED' ? 'ملغاة' : pkg.status}</span></div><strong>{pkg.isFullResolution ? 'تعالج الضغط الحالي بالكامل حسابيًا' : 'معالجة جزئية'}</strong></div>
        <section className="statement-kpis"><div><span>العجز الالتزامي قبل</span><strong>{money(pkg.committedDeficitBefore)}</strong></div><div><span>العجز الالتزامي بعد الحزمة</span><strong>{money(pkg.committedDeficitAfter)}</strong></div><div><span>فجوة الرحلات قبل</span><strong>{money(pkg.tripGapBefore)}</strong></div><div><span>فجوة الموعد بعد الحزمة</span><strong>{money(pkg.tripGapAfter)}</strong></div><div><span>فجوة نُقلت زمنيًا</span><strong>{money(pkg.timingShiftAmount)}</strong></div></section>
        <div><h3>إجراءات الحزمة</h3>{pkg.items.map(item => <div key={item.id} className="section-title-row"><div><strong>{item.title}</strong><span>{money(item.amount)} · {item.verificationStatus === 'VERIFIED' ? 'تم التحقق من التنفيذ فعليًا' : item.status === 'READY' ? 'جاهز للتنفيذ / بانتظار التحقق' : item.status === 'PENDING' ? 'بانتظار اعتماد الحزمة' : 'حالة تنفيذ غير معروفة'}</span>{item.lastCheckedAt?<small>آخر تحقق: {formatFinancialDateTime(item.lastCheckedAt)}</small>:null}</div>{['APPROVED','IN_PROGRESS'].includes(pkg.status) && item.status === 'READY' ? <Link className="secondary-link" href={item.executionPath}>فتح مسار التنفيذ</Link> : null}</div>)}</div>
        {pkg.status === 'DRAFT' ? <div className="button-row"><form action={approveCompositePressurePackageAction}><input type="hidden" name="packageId" value={pkg.id}/><button className="primary-button" type="submit">اعتماد الحزمة</button></form><form action={cancelCompositePressurePackageAction}><input type="hidden" name="packageId" value={pkg.id}/><button className="secondary-button" type="submit">إلغاء الحزمة</button></form></div> : null}
        {['APPROVED','IN_PROGRESS'].includes(pkg.status) ? <><p className="muted">الاعتماد لا ينفذ الإجراءات تلقائيًا. كل عنصر يحتفظ بمساره المحاسبي/التشغيلي الصحيح، ولا يكتمل إلا بعد تحقق التغيير الفعلي.</p><form action={refreshCompositePressurePackageExecutionAction}><input type="hidden" name="packageId" value={pkg.id}/><button className="secondary-button" type="submit">التحقق من التنفيذ الآن</button></form></> : null}
        {pkg.status === 'COMPLETED' ? <div><p><strong>اكتملت الحزمة بعد تحقق جميع التغييرات فعليًا.</strong></p>
          {pkg.outcomeStatus === 'EVALUATED' ? <><div className="section-title-row"><div><strong>{outcomeLabel(pkg.outcomeClass)}</strong><span>مقارنة النتيجة الفعلية بما توقعته الحزمة عند اعتمادها.</span></div>{pkg.outcomeEvaluatedAt ? <small>{new Date(pkg.outcomeEvaluatedAt).toLocaleString('ar-SA')}</small> : null}</div>
            <section className="statement-kpis"><div><span>العجز المتوقع بعد الحزمة</span><strong>{money(pkg.committedDeficitAfter)}</strong></div><div><span>العجز الفعلي بعد التنفيذ</span><strong>{money(pkg.actualCommittedDeficitAfter ?? 0)}</strong><small>فرق {money(pkg.committedOutcomeVariance ?? 0)}</small></div><div><span>فجوة الرحلة المتوقعة بعد الحزمة</span><strong>{money(pkg.tripGapAfter)}</strong></div><div><span>فجوة الرحلة الفعلية عند الموعد</span><strong>{money(pkg.actualTripGapAfter ?? 0)}</strong><small>فرق {money(pkg.tripGapOutcomeVariance ?? 0)}</small></div><div><span>ضغط انتقل زمنيًا</span><strong>{money(pkg.actualShiftedTripGap ?? 0)}</strong></div></section>
            <p className="muted">الفرق = الفعلي − المتوقع. القيمة الموجبة تعني أن النتيجة أسوأ من المتوقع بهذا المقدار، والسالبة تعني نتيجة أفضل من المتوقع. لا تُستخدم نسبة سماح اعتباطية.</p></> : <form action={evaluateCompositePressurePackageOutcomeAction}><input type="hidden" name="packageId" value={pkg.id}/><button className="secondary-button" type="submit">إعادة حساب النتيجة بعد التنفيذ</button></form>}
        </div> : null}
      </article>)}</div>}
    </section></div></details>

    <details className="ux-progressive-disclosure p75-secondary-section"><summary>نتائج القرارات السابقة</summary><div className="ux-progressive-disclosure__content"><section className="p47-analysis-card"><div className="section-title-row"><div><h2>ما تعلّمه النظام من قراراتك</h2><p className="muted">سجل قابل للتفسير من الحزم المكتملة. هذه الملاحظات لا تثبت أن إجراءً منفردًا سبب النتيجة؛ هي علاقة مشاركة داخل حزمة مركبة.</p></div></div>
      {!decisionLearning.length?<p className="muted">لا توجد حزم مكتملة ومقيّمة بما يكفي لعرض تعلم قرارات بعد.</p>:<div className="dashboard-list">{decisionLearning.map(l=><article className="form-card p47-learning-card" key={l.scenarioKind}><div className="section-title-row"><div><strong>{l.interpretation.split(':')[0]}</strong><span>{l.interpretation.split(':').slice(1).join(':').trim()}</span></div><strong>{l.observations} ملاحظة</strong></div><section className="statement-kpis"><div><span>ضمن حزم حلت الضغط</span><strong>{l.resolvedPackages}</strong></div><div><span>ضمن حزم خففته</span><strong>{l.reducedPackages}</strong></div><div><span>ضمن حزم نقلته زمنيًا</span><strong>{l.shiftedPackages}</strong></div><div><span>ضمن حزم ساءت نتيجتها</span><strong>{l.worsenedPackages}</strong></div><div><span>تخفيف التزامي مرصود بالحزم</span><strong>{money(l.observedCommittedRelief)}</strong></div><div><span>تخفيف فجوات رحلات مرصود</span><strong>{money(l.observedTripRelief)}</strong></div><div><span>ضغط منقول زمنيًا</span><strong>{money(l.observedShiftedTripGap)}</strong></div></section><small className="muted">طريقة الإسناد: مشاركة داخل حزمة مركبة — لا يوجد ادعاء سببي منفرد.</small></article>)}</div>}
    </section></div></details>

    <details className="ux-progressive-disclosure p75-secondary-section"><summary>حدود التحليل</summary><div className="ux-progressive-disclosure__content"><section className="p47-analysis-card"><h2>حوكمة السيناريوهات</h2><p className="muted">الحزمة المركبة تجمع قرارات مستقلة حسابيًا لكنها لا تدمجها في قيد مالي واحد. ترتيب البدائل لا ينفذ شيئًا ولا يغير الخطة؛ هو ترتيب استرشادي فقط، ويظل التأجيل الزمني بعد التخفيف المالي المباشر. خفض مساهمة هدف يمر بمراجعة الهدف/الخطة، حجز رصيد هدف يبقى حجزًا داخليًا، تأجيل الرحلة يغير التاريخ فقط، وتحرير بند مرن يحتاج Revision رسمي. يمنع النظام الجمع بين حجز تمويل رحلة وتأجيل الرحلة نفسها داخل الحزمة الواحدة.</p></section>

    <section className="p47-analysis-card"><h2>حدود هذه القراءة</h2><p className="muted">الدخل المستقبلي غير المعروف لا يتم اختراعه؛ يستخدم التقرير دخل الدورة الحالية كمرجع معلن فقط. كما لا يخلط فجوة الرحلة مع مساهمة الهدف كي لا يحتسب نفس الحاجة مرتين. لا توجد نسبة خطر أو هامش اعتباطي: الحالة تتغير فقط عند عجز حسابي فعلي أو وجود فجوة رحلة معلومة.</p></section></div></details>
  </div></main>;
}
