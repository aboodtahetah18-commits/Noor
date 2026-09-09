import { describe, expect, it } from "vitest";

import {
  ACCOUNT_TYPES,
  ALLOCATION_STATUSES,
  BUDGET_CATEGORY_STATUSES,
  CATEGORY_GROUPS,
  CYCLE_REVIEW_STATUSES,
  DEFICIT_RISK_STATUSES,
  EMERGENCY_FUND_STATUSES,
  EXPENSE_NATURES,
  FINANCIAL_CYCLE_STATUSES,
  FINANCIAL_PLAN_STATUSES,
  GOAL_STATUSES,
  INCOME_KINDS,
  OBLIGATION_RECURRENCES,
  OBLIGATION_STATUSES,
  PLANNING_STATUSES,
  RECOMMENDATION_STATUSES,
  RECOMMENDATION_TYPES,
  SAFE_TO_SPEND_STATUSES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  isOneOf,
} from "@/domain/types";

describe("Phase 3 domain types", () => {
  it("matches the authoritative financial cycle and plan states", () => {
    expect(FINANCIAL_CYCLE_STATUSES).toEqual(["DRAFT", "ACTIVE", "CLOSING", "CLOSED"]);
    expect(FINANCIAL_PLAN_STATUSES).toEqual(["PLAN_DRAFT", "ACTIVE_PLAN", "REVISED", "CLOSED_PLAN"]);
  });

  it("matches the authoritative transaction vocabulary", () => {
    expect(TRANSACTION_TYPES).toEqual([
      "INCOME",
      "EXPENSE",
      "TRANSFER",
      "REFUND",
      "SAVING_TRANSFER",
      "EMERGENCY_CONTRIBUTION",
      "EMERGENCY_WITHDRAWAL",
      "GOAL_CONTRIBUTION",
      "OBLIGATION_PAYMENT",
    ]);
    expect(TRANSACTION_STATUSES).toEqual(["PENDING", "POSTED", "REVERSED", "FAILED"]);
    expect(PLANNING_STATUSES).toEqual(["PLANNED", "UNPLANNED"]);
    expect(EXPENSE_NATURES).toEqual(["NECESSARY", "IMPORTANT", "OPTIONAL", "ENTERTAINMENT", "UNPLANNED"]);
  });

  it("matches obligations, allocations, goals and emergency states", () => {
    expect(OBLIGATION_STATUSES).toEqual(["UPCOMING", "DUE", "OVERDUE", "PAID", "CANCELLED"]);
    expect(OBLIGATION_RECURRENCES).toEqual(["ONCE", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]);
    expect(ALLOCATION_STATUSES).toEqual(["PLANNED", "ALLOCATED", "PARTIALLY_TRANSFERRED", "TRANSFERRED", "CANCELLED"]);
    expect(GOAL_STATUSES).toEqual(["DRAFT", "ACTIVE", "FINANCIALLY_UNREALISTIC", "PAUSED", "ACHIEVED", "CANCELLED"]);
    expect(EMERGENCY_FUND_STATUSES).toEqual(["NOT_CONFIGURED", "BUILDING", "FUNDED", "DEPLETED"]);
  });

  it("does not invent unapproved analytical states", () => {
    expect(BUDGET_CATEGORY_STATUSES).toEqual(["NORMAL", "AT_RISK", "OVER_BUDGET"]);
    expect(DEFICIT_RISK_STATUSES).toEqual(["NO_DEFICIT", "DEFICIT_RISK"]);
    expect(SAFE_TO_SPEND_STATUSES).toEqual(["AVAILABLE", "ZERO"]);
    expect(CYCLE_REVIEW_STATUSES).toEqual(["GENERATING", "READY", "ARCHIVED", "FAILED"]);
  });

  it("matches recommendations and supporting classifications", () => {
    expect(RECOMMENDATION_STATUSES).toEqual(["NEW", "VIEWED", "ACCEPTED", "DISMISSED", "EXPIRED", "RESOLVED"]);
    expect(RECOMMENDATION_TYPES).toEqual(["WARNING", "OPPORTUNITY", "CORRECTION", "GOAL", "POSITIVE"]);
    expect(ACCOUNT_TYPES).toEqual(["BANK", "SAVINGS", "CASH", "OTHER"]);
    expect(CATEGORY_GROUPS).toEqual(["OBLIGATION", "ESSENTIAL", "SAVING", "EMERGENCY", "GOAL", "FLEXIBLE"]);
    expect(INCOME_KINDS).toEqual(["SALARY", "ADDITIONAL_INCOME", "BONUS", "OTHER"]);
  });

  it("provides a reusable runtime guard without weakening compile-time types", () => {
    expect(isOneOf(TRANSACTION_TYPES, "EXPENSE")).toBe(true);
    expect(isOneOf(TRANSACTION_TYPES, "expense")).toBe(false);
    expect(isOneOf(TRANSACTION_TYPES, 123)).toBe(false);
  });
});
