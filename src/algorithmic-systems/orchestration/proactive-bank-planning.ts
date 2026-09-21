import type {
  ActiveNamaaGoal,
  BankForwardNeed,
  InterbankAllocationProposal,
  InterbankPosition,
  NamaaBank
} from "../domain/interbank-planning";

const priorityWeight = {CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1} as const;

export function validateForwardNeed(need:BankForwardNeed):string[] {
  const errors:string[] = [];
  if (need.targetAmount < need.currentAmount) errors.push("الهدف أقل من الوضع الحالي");
  if (need.gapAmount !== Math.max(0, need.targetAmount - need.currentAmount)) errors.push("فجوة الاحتياج غير متطابقة");
  if (need.minimumAcceptableAmount > need.idealAmount) errors.push("الحد الأدنى أكبر من المبلغ المثالي");
  if (need.idealAmount > need.gapAmount) errors.push("المبلغ المثالي يتجاوز فجوة الاحتياج");
  if (need.horizonDays <= 0) errors.push("أفق الاحتياج غير صالح");
  return errors;
}

export function rankForwardNeeds(needs:BankForwardNeed[]):BankForwardNeed[] {
  return [...needs].sort((a,b) => {
    const p = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (p !== 0) return p;
    const horizon = a.horizonDays - b.horizonDays;
    if (horizon !== 0) return horizon;
    return b.confidenceScore - a.confidenceScore;
  });
}

export function buildActiveGoal(need:BankForwardNeed, supportingBanks:NamaaBank[]):ActiveNamaaGoal {
  return {
    id:`goal:${need.id}`,
    title:need.title,
    owningBank:need.bank,
    supportingBanks:[...new Set(supportingBanks.filter(b => b !== need.bank))],
    targetAmount:need.targetAmount,
    currentAmount:need.currentAmount,
    priority:need.priority,
    horizonDays:need.horizonDays,
    why:need.rationale,
    nextAction:need.gapAmount > 0 ? "معالجة فجوة الاحتياج ضمن دورة التخطيط بين البنوك" : "متابعة الاستقرار"
  };
}

export function negotiateInterbankAllocation(
  availableAmount:number,
  needs:BankForwardNeed[],
  positions:InterbankPosition[]
):InterbankAllocationProposal {
  let remaining = Math.max(0, availableAmount);
  const allocations:InterbankAllocationProposal["allocations"] = [];
  const unresolvedConflicts:string[] = [];

  for (const need of rankForwardNeeds(needs.filter(n => n.status !== "CLOSED"))) {
    if (remaining <= 0) break;
    const position = positions.find(p => p.bank === need.bank);
    const requested = Math.min(
      need.gapAmount,
      position?.requestedAmount ?? need.idealAmount
    );
    const minimum = Math.min(requested, position?.minimumAmount ?? need.minimumAcceptableAmount);
    const amount = Math.min(remaining, requested);

    if (amount < minimum && need.priority === "CRITICAL") {
      unresolvedConflicts.push(`تعذر بلوغ الحد الأدنى للاحتياج الحرج: ${need.title}`);
    }

    if (amount > 0) {
      allocations.push({bank:need.bank, amount, needId:need.id});
      remaining -= amount;
    }
  }

  const requestedTotal = needs.reduce((sum,n) => sum + Math.max(0,n.idealAmount),0);
  return {
    availableAmount,
    allocations,
    unallocatedAmount:remaining,
    unresolvedConflicts,
    requiresCentralReview:unresolvedConflicts.length > 0 || requestedTotal > availableAmount,
    requiresUserAction:allocations.some(a => a.amount > 0)
  };
}

export function shouldProactivelyOpenCase(need:BankForwardNeed):boolean {
  if (validateForwardNeed(need).length > 0) return false;
  return need.gapAmount > 0 && (
    need.priority === "CRITICAL" ||
    need.priority === "HIGH" ||
    need.horizonDays <= 60
  );
}
