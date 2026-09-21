import type { FinancialDomain } from "../domain/types";

export interface RoutingInput {
  caseType:string;
  liquidityImpactMaterial?:boolean;
  goalConflict?:boolean;
  financingInvolved?:boolean;
  investmentDecisionMaterial?:boolean;
}

export interface RoutingResult {
  primaryDomain:FinancialDomain;
  systems:string[];
  owners:string[];
  committees:string[];
  policies:string[];
}

export function routeCase(input:RoutingInput):RoutingResult {
  switch (input.caseType) {
    case "obligation_due":
      return {
        primaryDomain:"OBLIGATIONS_DEBT",
        systems:["منظومة الالتزامات والديون", ...(input.liquidityImpactMaterial ? ["منظومة المخاطر المركزية"] : [])],
        owners:["مسؤول الالتزامات"],
        committees:input.goalConflict ? ["لجنة الأهداف والالتزامات"] : [],
        policies:["سياسة التعلم الخوارزمي","عقد البيانات والتكامل المركزي"]
      };
    case "investment_opportunity":
      return {
        primaryDomain:"INVESTMENT",
        systems:["منظومة الاستثمار والأهداف", ...(input.liquidityImpactMaterial ? ["منظومة المخاطر المركزية"] : [])],
        owners:["مسؤول الاستثمار"],
        committees:input.investmentDecisionMaterial ? ["لجنة الاستثمار والأصول"] : [],
        policies:["سياسة التعلم الخوارزمي","سياسة بنك الأصول الاستثماري"]
      };
    case "liquidity_pressure":
      return {
        primaryDomain:"LIQUIDITY_PROTECTION",
        systems:["منظومة المخاطر المركزية"],
        owners:["مسؤول السيولة والحماية"],
        committees:input.financingInvolved ? ["لجنة الاستقرار والسيولة والتمويل"] : [],
        policies:["سياسات الحماية والسيولة","عقد البيانات والتكامل المركزي"]
      };
    default:
      return {
        primaryDomain:"GOVERNANCE",
        systems:[],
        owners:["مدير بنك نماء المركزي"],
        committees:[],
        policies:["عقد البيانات والتكامل المركزي"]
      };
  }
}
