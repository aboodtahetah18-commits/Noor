export type DeliberationMove =
  | "POSITION" | "QUESTION" | "OBJECTION" | "RESPONSE" | "CLARIFICATION"
  | "CONCESSION" | "ALTERNATIVE" | "DATA_REQUEST" | "AGREEMENT"
  | "OPEN_CONFLICT" | "ESCALATION";

export interface MeetingStatement {
  speakerRole:string;
  move:DeliberationMove;
  topic:string;
  claim:string;
  evidenceRefs:string[];
  impact?:string;
  alternative?:string;
  minimumAcceptable?:string;
}

export function validateStatement(s:MeetingStatement):string[] {
  const errors:string[] = [];
  if (!s.speakerRole) errors.push("يجب تحديد المسؤول المتحدث.");
  if (!s.topic) errors.push("يجب ربط المداخلة بموضوع محدد.");
  if (!s.claim) errors.push("يجب أن تحتوي المداخلة على موقف واضح.");
  if (s.move === "OBJECTION" && !s.impact) errors.push("الاعتراض يجب أن يوضح الأثر على مجال المسؤول.");
  if (s.move === "OBJECTION" && s.evidenceRefs.length === 0) errors.push("الاعتراض الجوهري يجب أن يستند إلى دليل أو نتيجة تحليل.");
  return errors;
}
