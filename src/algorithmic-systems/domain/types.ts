export type ConfidenceLevel = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
export type SyncStatus = "SYNCED" | "STALE" | "PENDING_CONFIRMATION" | "CONFLICT" | "UNAVAILABLE" | "MANUAL_ONLY";
export type CaseState =
  | "OPEN" | "DATA_COLLECTION" | "ANALYSIS" | "CONFLICT_RESOLUTION"
  | "COMMITTEE_REVIEW" | "DECISION_READY" | "DECISION_APPROVED"
  | "USER_ACTION_PENDING" | "EXECUTION_PARTIAL" | "EXECUTION_CONFIRMED"
  | "MONITORING" | "REASSESSMENT" | "FINAL_DECISION" | "CLOSED";
export type FinancialDomain =
  | "BUDGET_SPENDING" | "OBLIGATIONS_DEBT" | "GOALS" | "INVESTMENT"
  | "LIQUIDITY_PROTECTION" | "COMPOSITE_RISK" | "EXECUTION_MATCHING"
  | "GOVERNANCE" | "LEARNING";

export interface VersionRefs {
  policyVersion:string;
  algorithmVersion:string;
  modelVersion:string;
  parameterVersion:string;
  authorityMatrixVersion:string;
  dataContractVersion:string;
  learningProfileVersion:string;
}

export interface DataQuality {
  sourceQuality:number;
  completeness:number;
  recency:number;
  historyDepth:number;
  consistency:number;
  syncStatus:SyncStatus;
}

export interface FinancialSnapshot {
  availableBalance:number;
  reservedAmount:number;
  protectedAmount:number;
  realizedIncome:number;
  expectedIncome:number;
  dueObligations:number;
  nearTermGoalNeed:number;
  minimumLivingNeed:number;
}

export interface DecisionTrace {
  caseId:string;
  primaryDomain:FinancialDomain;
  secondaryDomains:FinancialDomain[];
  versions:VersionRefs;
  confidenceScore:number;
  confidenceLevel:ConfidenceLevel;
  policiesLoaded:string[];
  systemsInvoked:string[];
  ownersAssigned:string[];
  committeesLoaded:string[];
  hardGuardsChecked:string[];
}
