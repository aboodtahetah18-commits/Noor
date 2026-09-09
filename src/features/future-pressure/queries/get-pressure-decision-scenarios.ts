import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';
import { getFutureFinancialPressure, type FutureFinancialPressure } from './get-future-financial-pressure';
import { getTripFundingReadiness } from '@/features/goal-events/queries/get-trip-funding-readiness';
import { getPressureDecisionLearning } from './get-pressure-decision-learning';
import { rankPressureDecisionScenarios, type PressureScenarioLearningEvidence } from '../services/rank-pressure-decision-scenarios';

type ScenarioKind =
  | 'RESERVE_UNASSIGNED_GOAL_FUNDS'
  | 'DEFER_TRIP_ONE_CYCLE'
  | 'REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE'
  | 'REDIRECT_CURRENT_FLEXIBLE_HEADROOM';

export type PressureDecisionScenario = {
  id: string;
  kind: ScenarioKind;
  title: string;
  description: string;
  targetCycleIndex: number;
  targetCycleLabel: string;
  committedDeficitBefore: string;
  committedDeficitRelief: string;
  committedDeficitAfter: string;
  tripGapBefore: string;
  tripGapReliefAtCurrentDeadline: string;
  tripGapAfterAtCurrentDeadline: string;
  timingShiftOnly: boolean;
  affectedGoalId: string | null;
  affectedGoalName: string | null;
  affectedEventId: string | null;
  affectedEventTitle: string | null;
  amount: string;
  sideEffect: string;
  approvalPath: string;
  approvalLabel: string;
  assumptions: string[];
  recommendationOrder?: number;
  learningEvidence?: PressureScenarioLearningEvidence;
};

export type PressureDecisionScenarioSet = {
  forecast: FutureFinancialPressure;
  targetCycleIndex: number | null;
  targetCycleLabel: string | null;
  scenarios: PressureDecisionScenario[];
  flexibleHeadroomCurrentCycle: string;
  notes: string[];
};

function money(value: string) {
  return Money.parse(value);
}
function maxZero(value: Money) { return value.isNegative() ? Money.zero() : value; }
function scenarioId(parts: Array<string | number>) { return parts.join(':'); }

/**
 * Decision scenarios are analytical only. They never write plan, goal, event, reservation,
 * or transaction data. Each scenario shows exact arithmetic relief and its trade-off.
 */
export async function getPressureDecisionScenarios(userId: string, horizonCycles = 6): Promise<PressureDecisionScenarioSet | null> {
  const forecast = await getFutureFinancialPressure(userId, horizonCycles);
  if (!forecast) return null;

  const firstPressureIndex = forecast.cycles.findIndex(c =>
    (c.capacityAfterCommittedOutflow !== null && Money.parse(c.capacityAfterCommittedOutflow).isNegative()) || Money.parse(c.tripDeadlineUncoveredAmount).isPositive()
  );
  const target = firstPressureIndex >= 0 ? forecast.cycles[firstPressureIndex] : null;

  const flexibleRows = await rawSql`
    select ba.category_id as "categoryId",bc.name as "categoryName",ba.planned_amount::text as "plannedAmount",
      coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0)::text as "actualAmount",
      greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0)::text as "availableHeadroom"
    from public.financial_cycles c
    join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status='ACTIVE_PLAN'
    join public.plan_versions pv on pv.plan_id=p.id and pv.is_current=true
    join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=c.user_id and ba.allocation_type='FLEXIBLE'
    join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=c.user_id and bc.category_group='FLEXIBLE'
    left join public.transactions t on t.user_id=c.user_id and t.cycle_id=c.id and t.category_id=ba.category_id
    where c.user_id=${userId} and c.status='ACTIVE'
    group by ba.category_id,bc.name,ba.planned_amount
    having greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0)>0
    order by greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0) desc,bc.name`;
  const flexibleHeadroom = (flexibleRows as Array<{ availableHeadroom: string }>).reduce((sum, row) => sum.add(Money.parse(row.availableHeadroom)), Money.zero());

  if (!target) {
    return {
      forecast,
      targetCycleIndex: null,
      targetCycleLabel: null,
      scenarios: [],
      flexibleHeadroomCurrentCycle: flexibleHeadroom.toString(),
      notes: ['لا يوجد ضغط حسابي أو فجوة رحلة ضمن الأفق الحالي، لذلك لا توجد سيناريوهات إصلاح لازمة.'],
    };
  }

  const committedCapacity = target.capacityAfterCommittedOutflow === null ? null : Money.parse(target.capacityAfterCommittedOutflow);
  const committedBefore = committedCapacity?.isNegative() ? committedCapacity.abs() : Money.zero();
  const tripGapBefore = money(target.tripDeadlineUncoveredAmount);
  const scenarios: PressureDecisionScenario[] = [];

  // A contribution reduction is an explicit one-cycle what-if. It relieves committed cash pressure
  // by the same amount, but reduces funding delivered to that goal in that cycle.
  if (committedBefore.isPositive()) {
    for (const goal of target.goalContributions) {
      const current = money(goal.amount);
      const relief = current.min(committedBefore);
      if (!relief.isPositive()) continue;
      const after = maxZero(committedBefore.subtract(relief));
      const affectedTrips = forecast.cycles
        .filter(c => c.cycleIndex >= target.cycleIndex)
        .flatMap(c => c.trips)
        .filter(t => t.goalId === goal.goalId).length;
      scenarios.push({
        id: scenarioId(['goal-contribution', target.cycleIndex, goal.goalId]),
        kind: 'REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE',
        title: `خفض مساهمة هدف «${goal.goalName}» في دورة الضغط`,
        description: `خفض مؤقت لا يتجاوز ${relief.toString()} ريال في هذه الدورة فقط.`,
        targetCycleIndex: target.cycleIndex,
        targetCycleLabel: target.label,
        committedDeficitBefore: committedBefore.toString(),
        committedDeficitRelief: relief.toString(),
        committedDeficitAfter: after.toString(),
        tripGapBefore: tripGapBefore.toString(),
        tripGapReliefAtCurrentDeadline: '0.00',
        tripGapAfterAtCurrentDeadline: tripGapBefore.toString(),
        timingShiftOnly: false,
        affectedGoalId: goal.goalId,
        affectedGoalName: goal.goalName,
        affectedEventId: null,
        affectedEventTitle: null,
        amount: relief.toString(),
        sideEffect: affectedTrips > 0
          ? `يقل تمويل الهدف بهذه القيمة في دورة واحدة، ويوجد ${affectedTrips} موعد رحلة لهذا الهدف ضمن الأفق يحتاج إعادة تقييم بعد القرار.`
          : 'يقل تمويل الهدف بهذه القيمة في دورة واحدة، ما قد يؤخر الوصول إلى الهدف.',
        approvalPath: `/goals/${goal.goalId}`,
        approvalLabel: 'فتح الهدف للمراجعة',
        assumptions: ['لا يغير السيناريو مساهمات الدورات الأخرى.', 'لا يتم تعديل الهدف أو الخطة من هذه الصفحة.'],
      });
    }
  }

  // For each trip at the first gap deadline: reserve currently unassigned goal money.
  if (tripGapBefore.isPositive()) {
    for (const trip of target.trips.filter(t => Money.parse(t.uncoveredAmount).isPositive())) {
      const readiness = await getTripFundingReadiness(userId, trip.eventId);
      if (!readiness) continue;
      const tripGap = money(trip.uncoveredAmount);
      const unassigned = Money.parse(readiness.unassignedGoalFunding);
      const reserveRelief = unassigned.min(tripGap);
      if (reserveRelief.isPositive()) {
        scenarios.push({
          id: scenarioId(['reserve-goal-funds', target.cycleIndex, trip.eventId]),
          kind: 'RESERVE_UNASSIGNED_GOAL_FUNDS',
          title: `حجز رصيد غير مخصص لرحلة «${trip.title}»`,
          description: `يوجد داخل الهدف رصيد غير مخصص يمكن حجز ${reserveRelief.toString()} ريال منه لهذه الرحلة.`,
          targetCycleIndex: target.cycleIndex,
          targetCycleLabel: target.label,
          committedDeficitBefore: committedBefore.toString(),
          committedDeficitRelief: '0.00',
          committedDeficitAfter: committedBefore.toString(),
          tripGapBefore: tripGap.toString(),
          tripGapReliefAtCurrentDeadline: reserveRelief.toString(),
          tripGapAfterAtCurrentDeadline: maxZero(tripGap.subtract(reserveRelief)).toString(),
          timingShiftOnly: false,
          affectedGoalId: trip.goalId,
          affectedGoalName: trip.goalName,
          affectedEventId: trip.eventId,
          affectedEventTitle: trip.title,
          amount: reserveRelief.toString(),
          sideEffect: 'لا يغير السيولة ولا مساهمة الهدف؛ فقط يقلل الرصيد غير المخصص داخل الهدف ويخصصه لهذه الرحلة.',
          approvalPath: `/goals/${trip.goalId}?event=${trip.eventId}`,
          approvalLabel: 'فتح الرحلة وحجز التمويل',
          assumptions: ['الحجز تنظيمي داخل الهدف ولا ينشئ حركة مالية.', 'لا يستخدم رصيدًا محجوزًا لرحلات أخرى.'],
        });
      }

      // Postponement moves the deadline one cycle; it is deliberately not presented as funding relief.
      const perCycle = target.goalContributions.find(g => g.goalId === trip.goalId)?.amount ?? '0.00';
      scenarios.push({
        id: scenarioId(['defer-trip', target.cycleIndex, trip.eventId]),
        kind: 'DEFER_TRIP_ONE_CYCLE',
        title: `تأجيل موعد «${trip.title}» دورة واحدة`,
        description: 'ينقل موعد الفجوة إلى دورة لاحقة بدل اعتبارها محلولة ماليًا.',
        targetCycleIndex: target.cycleIndex,
        targetCycleLabel: target.label,
        committedDeficitBefore: committedBefore.toString(),
        committedDeficitRelief: '0.00',
        committedDeficitAfter: committedBefore.toString(),
        tripGapBefore: tripGap.toString(),
        tripGapReliefAtCurrentDeadline: tripGap.toString(),
        tripGapAfterAtCurrentDeadline: '0.00',
        timingShiftOnly: true,
        affectedGoalId: trip.goalId,
        affectedGoalName: trip.goalName,
        affectedEventId: trip.eventId,
        affectedEventTitle: trip.title,
        amount: tripGap.toString(),
        sideEffect: Money.parse(perCycle).isPositive()
          ? `الفجوة لا تختفي؛ تنتقل إلى الموعد الجديد. وإذا استمرت مساهمة الهدف الحالية، توجد فرصة مساهمة إضافية قدرها ${money(perCycle).toString()} ريال قبل الموعد الجديد.`
          : 'الفجوة لا تختفي؛ تنتقل إلى الموعد الجديد، ولا توجد مساهمة دورية معتمدة حاليًا يمكن افتراضها.',
        approvalPath: `/goals/${trip.goalId}?event=${trip.eventId}`,
        approvalLabel: 'فتح الرحلة لمراجعة الموعد',
        assumptions: ['لا يعتبر التأجيل تخفيضًا لتكلفة الرحلة.', 'يجب إعادة حساب خط تمويل الهدف بعد تغيير التاريخ فعليًا.'],
      });
    }

    // Flexible headroom is only a defensible current-cycle scenario. Future flexible headroom is unknown.
    if (target.cycleIndex === 0 && flexibleHeadroom.isPositive()) {
      const relief = flexibleHeadroom.min(tripGapBefore);
      scenarios.push({
        id: scenarioId(['flex-to-trip', target.cycleIndex]),
        kind: 'REDIRECT_CURRENT_FLEXIBLE_HEADROOM',
        title: 'تحرير جزء من البنود المرنة الحالية لتمويل الرحلة',
        description: `الرصيد غير المصروف في البنود المرنة الحالية يصل إلى ${flexibleHeadroom.toString()} ريال.`,
        targetCycleIndex: target.cycleIndex,
        targetCycleLabel: target.label,
        committedDeficitBefore: committedBefore.toString(),
        committedDeficitRelief: '0.00',
        committedDeficitAfter: committedBefore.toString(),
        tripGapBefore: tripGapBefore.toString(),
        tripGapReliefAtCurrentDeadline: relief.toString(),
        tripGapAfterAtCurrentDeadline: maxZero(tripGapBefore.subtract(relief)).toString(),
        timingShiftOnly: false,
        affectedGoalId: null,
        affectedGoalName: null,
        affectedEventId: null,
        affectedEventTitle: null,
        amount: relief.toString(),
        sideEffect: 'يتطلب Revision صريحًا للخطة، ثم تمويل الهدف/الرحلة فعليًا. لا يعتبر الرصيد المرن تمويلًا للرحلة بمجرد عرضه هنا.',
        approvalPath: '/budget/revise',
        approvalLabel: 'فتح تعديل الخطة',
        assumptions: ['يعتمد فقط على الرصيد المرن غير المصروف في الدورة الحالية.', 'لا يتم إسقاط هذا الرصيد على دورات مستقبلية.'],
      });
    }
  }

  const decisionLearning = await getPressureDecisionLearning(userId);
  const rankedScenarios = rankPressureDecisionScenarios(scenarios, decisionLearning);

  return {
    forecast,
    targetCycleIndex: target.cycleIndex,
    targetCycleLabel: target.label,
    scenarios: rankedScenarios,
    flexibleHeadroomCurrentCycle: flexibleHeadroom.toString(),
    notes: [
      'السيناريوهات محاكاة قرار ولا تنفذ أي Write مالي أو تعديل خطة.',
      'لا توجد أولوية تلقائية بين الأهداف أو الرحلات؛ تعرض البدائل منفصلة حتى يختار المستخدم.',
      'تأجيل الرحلة يغير التوقيت فقط ولا يمحو الفجوة المالية.',
      'ترتيب السيناريوهات يحافظ أولًا على المعنى المالي الحالي، ثم يستخدم نتائج الحزم السابقة كدليل استرشادي قابل للتفسير دون ادعاء سببي.',
    ],
  };
}
