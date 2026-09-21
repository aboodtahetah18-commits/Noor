import type { ConfidenceLevel, DataQuality } from "../domain/types";

export function calculateConfidenceScore(q:DataQuality):number {
  let score =
    0.30*q.sourceQuality +
    0.25*q.completeness +
    0.20*q.recency +
    0.15*q.historyDepth +
    0.10*q.consistency;

  if (q.syncStatus === "CONFLICT") score = Math.min(score, 49);
  if (q.syncStatus === "UNAVAILABLE") score = Math.min(score, 29);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function confidenceLevel(score:number):ConfidenceLevel {
  if (score >= 85) return "VERY_HIGH";
  if (score >= 70) return "HIGH";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "LOW";
  return "VERY_LOW";
}
