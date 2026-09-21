import type { CaseState } from "../domain/types";

export interface CaseContext {
  id:string;
  state:CaseState;
  materialDataSufficient:boolean;
  materialConflictDetected:boolean;
  committeeRequired:boolean;
  externalActionRequired:boolean;
}

export function nextCaseState(ctx:CaseContext):CaseState {
  switch (ctx.state) {
    case "OPEN": return "DATA_COLLECTION";
    case "DATA_COLLECTION":
      if (ctx.materialConflictDetected) return "CONFLICT_RESOLUTION";
      if (ctx.materialDataSufficient) return "ANALYSIS";
      return "DATA_COLLECTION";
    case "ANALYSIS": return ctx.committeeRequired ? "COMMITTEE_REVIEW" : "DECISION_READY";
    case "DECISION_READY": return "DECISION_APPROVED";
    case "DECISION_APPROVED": return ctx.externalActionRequired ? "USER_ACTION_PENDING" : "MONITORING";
    case "EXECUTION_CONFIRMED": return "MONITORING";
    case "MONITORING": return "REASSESSMENT";
    case "REASSESSMENT": return "FINAL_DECISION";
    case "FINAL_DECISION": return "CLOSED";
    default: return ctx.state;
  }
}
