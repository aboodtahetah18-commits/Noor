import type { FinancialDomain } from "./types";

export type NamaaBank = "HILAL" | "MALAA" | "ASSETS";
export type NeedPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type NeedStatus = "FORECAST" | "ACTIVE" | "NEGOTIATING" | "APPROVED" | "USER_ACTION_PENDING" | "MONITORING" | "CLOSED";

export interface BankForwardNeed {
  id:string;
  bank:NamaaBank;
  domain:FinancialDomain;
  title:string;
  currentAmount:number;
  targetAmount:number;
  gapAmount:number;
  horizonDays:number;
  minimumAcceptableAmount:number;
  idealAmount:number;
  priority:NeedPriority;
  rationale:string;
  protectedReason?:string;
  flexibleAmount?:number;
  sourceCandidates:string[];
  status:NeedStatus;
  confidenceScore:number;
}

export interface ActiveNamaaGoal {
  id:string;
  title:string;
  owningBank:NamaaBank;
  supportingBanks:NamaaBank[];
  targetAmount:number;
  currentAmount:number;
  priority:NeedPriority;
  horizonDays:number;
  why:string;
  nextAction:string;
}

export interface InterbankRequest {
  id:string;
  fromBank:NamaaBank;
  toBanks:NamaaBank[];
  needId:string;
  requestedAmount:number;
  minimumAmount:number;
  idealAmount:number;
  rationale:string;
  concessions:string[];
  nonNegotiables:string[];
  expiresAt?:string;
}

export interface InterbankPosition {
  bank:NamaaBank;
  requestedAmount:number;
  minimumAmount:number;
  rationale:string;
  objections:string[];
  conditionalConcessions:string[];
}

export interface InterbankAllocationProposal {
  availableAmount:number;
  allocations:Array<{bank:NamaaBank; amount:number; needId:string}>;
  unallocatedAmount:number;
  unresolvedConflicts:string[];
  requiresCentralReview:boolean;
  requiresUserAction:boolean;
}
