import { describe, expect, it } from "vitest";
import {
  canTransition,
  getNextState,
  InvalidStateTransitionError,
  StateTransitionPreconditionError,
  transition,
} from "@/state-machines";

describe("workflow state machine", () => {
  it.each([
    ["FINANCIAL_CYCLE", "DRAFT", "ACTIVATE_CYCLE", "ACTIVE"],
    ["FINANCIAL_CYCLE", "ACTIVE", "START_CLOSING", "CLOSING"],
    ["FINANCIAL_CYCLE", "CLOSING", "COMPLETE_CLOSING", "CLOSED"],
    ["FINANCIAL_PLAN", "PLAN_DRAFT", "APPROVE_PLAN", "ACTIVE_PLAN"],
    ["FINANCIAL_PLAN", "ACTIVE_PLAN", "REVISE_PLAN", "REVISED"],
    ["FINANCIAL_PLAN", "REVISED", "APPROVE_REVISION", "ACTIVE_PLAN"],
    ["OBLIGATION", "UPCOMING", "MARK_DUE", "DUE"],
    ["OBLIGATION", "DUE", "MARK_OVERDUE", "OVERDUE"],
    ["OBLIGATION", "OVERDUE", "PAY_OBLIGATION", "PAID"],
    ["GOAL", "DRAFT", "ACTIVATE_GOAL", "ACTIVE"],
    ["GOAL", "ACTIVE", "PAUSE_GOAL", "PAUSED"],
    ["GOAL", "PAUSED", "RESUME_GOAL", "ACTIVE"],
    ["TRANSACTION", "PENDING", "POST_TRANSACTION", "POSTED"],
    ["TRANSACTION", "PENDING", "FAIL_TRANSACTION", "FAILED"],
    ["TRANSACTION", "POSTED", "REVERSE_TRANSACTION", "REVERSED"],
    ["SAVING_ALLOCATION", "PLANNED", "ALLOCATE", "ALLOCATED"],
    ["SAVING_ALLOCATION", "ALLOCATED", "TRANSFER_PARTIALLY", "PARTIALLY_TRANSFERRED"],
    ["SAVING_ALLOCATION", "PARTIALLY_TRANSFERRED", "TRANSFER_FULLY", "TRANSFERRED"],
    ["RECOMMENDATION", "NEW", "VIEW_RECOMMENDATION", "VIEWED"],
    ["RECOMMENDATION", "VIEWED", "ACCEPT_RECOMMENDATION", "ACCEPTED"],
    ["RECOMMENDATION", "ACCEPTED", "RESOLVE_RECOMMENDATION", "RESOLVED"],
  ] as const)("%s: %s + %s -> %s", (entity, from, event, to) => {
    expect(canTransition(entity, from, event)).toBe(true);
    expect(getNextState(entity, from, event)).toBe(to);
  });

  it.each([
    ["FINANCIAL_CYCLE", "DRAFT", "COMPLETE_CLOSING"],
    ["FINANCIAL_CYCLE", "CLOSED", "ACTIVATE_CYCLE"],
    ["OBLIGATION", "PAID", "MARK_DUE"],
    ["GOAL", "ACHIEVED", "ACTIVATE_GOAL"],
    ["GOAL", "CANCELLED", "ACTIVATE_GOAL"],
    ["TRANSACTION", "FAILED", "POST_TRANSACTION"],
    ["TRANSACTION", "REVERSED", "POST_TRANSACTION"],
    ["RECOMMENDATION", "DISMISSED", "ACCEPT_RECOMMENDATION"],
  ] as const)("rejects forbidden transition %s: %s + %s", (entity, from, event) => {
    expect(canTransition(entity, from, event as never)).toBe(false);
    expect(() => getNextState(entity, from, event as never)).toThrow(InvalidStateTransitionError);
  });

  it("returns an auditable transition result", () => {
    const occurredAt = new Date("2026-09-02T13:00:00.000Z");
    const result = transition({
      entityType: "FINANCIAL_CYCLE",
      entityId: "cycle-1",
      currentState: "DRAFT",
      event: "ACTIVATE_CYCLE",
      occurredAt,
      actorUserId: "user-1",
      reason: "Initial activation",
      preconditions: [{ code: "HAS_NEXT_INCOME_DATE", satisfied: true }],
    });

    expect(result).toEqual({
      entityType: "FINANCIAL_CYCLE",
      entityId: "cycle-1",
      previousState: "DRAFT",
      currentState: "ACTIVE",
      event: "ACTIVATE_CYCLE",
      transitionTime: occurredAt,
      transitionReason: "Initial activation",
      actorUserId: "user-1",
    });
  });

  it("blocks a valid transition when an authoritative precondition fails", () => {
    expect(() =>
      transition({
        entityType: "FINANCIAL_CYCLE",
        entityId: "cycle-1",
        currentState: "DRAFT",
        event: "ACTIVATE_CYCLE",
        preconditions: [{ code: "HAS_NEXT_INCOME_DATE", satisfied: false }],
      }),
    ).toThrow(StateTransitionPreconditionError);
  });
});
