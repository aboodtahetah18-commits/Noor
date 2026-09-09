import { describe, expect, it } from "vitest";
import {
  resolveBudgetCategoryOverrunStatus,
  resolveBudgetCategoryStatus,
  resolveDeficitRiskStatus,
  resolveEmergencyFundStatus,
  resolveSafeToSpendStatus,
} from "@/state-machines";

describe("analytical state resolvers", () => {
  it("derives deficit risk strictly from projected end balance", () => {
    expect(resolveDeficitRiskStatus(-0.01)).toBe("DEFICIT_RISK");
    expect(resolveDeficitRiskStatus(0)).toBe("NO_DEFICIT");
  });

  it("derives Safe To Spend status without inventing LOW or CRITICAL", () => {
    expect(resolveSafeToSpendStatus(1)).toBe("AVAILABLE");
    expect(resolveSafeToSpendStatus(0)).toBe("ZERO");
    expect(resolveSafeToSpendStatus(-1)).toBe("ZERO");
  });

  it("derives emergency fund status from the documented target relationship", () => {
    expect(
      resolveEmergencyFundStatus({
        configured: false,
        currentBalance: 0,
        targetAmount: 0,
        wasPreviouslyFundedOrBuilding: false,
      }),
    ).toBe("NOT_CONFIGURED");

    expect(
      resolveEmergencyFundStatus({
        configured: true,
        currentBalance: 100,
        targetAmount: 500,
        wasPreviouslyFundedOrBuilding: true,
      }),
    ).toBe("BUILDING");

    expect(
      resolveEmergencyFundStatus({
        configured: true,
        currentBalance: 500,
        targetAmount: 500,
        wasPreviouslyFundedOrBuilding: true,
      }),
    ).toBe("FUNDED");

    expect(
      resolveEmergencyFundStatus({
        configured: true,
        currentBalance: 0,
        targetAmount: 500,
        wasPreviouslyFundedOrBuilding: true,
      }),
    ).toBe("DEPLETED");
  });

  it("resolves AT_RISK from linear cycle pace without an arbitrary threshold", () => {
    expect(resolveBudgetCategoryOverrunStatus({ actualSpend: 500, budget: 500 })).toBe("NORMAL");
    expect(resolveBudgetCategoryOverrunStatus({ actualSpend: 501, budget: 500 })).toBe("OVER_BUDGET");
    expect(resolveBudgetCategoryStatus({ actualSpendMinorUnits: 30000n, budgetMinorUnits: 100000n, daysElapsed: 5, cycleDays: 30 })).toBe("AT_RISK");
    expect(resolveBudgetCategoryStatus({ actualSpendMinorUnits: 10000n, budgetMinorUnits: 100000n, daysElapsed: 5, cycleDays: 30 })).toBe("NORMAL");
  });
});
