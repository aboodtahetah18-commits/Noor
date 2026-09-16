import type { AuthorizationGrant, GovernanceAction, GovernanceObjectType, GovernanceRole } from './authorization-policy';

export interface AuthorizationGrantTemplate {
  key: string;
  role: GovernanceRole;
  action: GovernanceAction;
  objectType: GovernanceObjectType;
  scope: 'GLOBAL' | 'BANK' | 'COMMITTEE';
  maxRisk?: AuthorizationGrant['maxRisk'];
  maxMateriality?: AuthorizationGrant['maxMateriality'];
  description: string;
}

export const AUTHORIZATION_GRANT_TEMPLATES: readonly AuthorizationGrantTemplate[] = [
  { key:'central-board-administer', role:'CENTRAL_BOARD_MEMBER', action:'ADMINISTER', objectType:'AUDIT_EVENT', scope:'GLOBAL', description:'إدارة دورة الصلاحيات نفسها بعد التأسيس الرسمي.' },
  { key:'central-board-proposal-approve', role:'CENTRAL_BOARD_MEMBER', action:'APPROVE', objectType:'CHANGE_PROPOSAL', scope:'GLOBAL', maxRisk:'CRITICAL', maxMateriality:'CRITICAL', description:'اعتماد مقترحات التغيير مع بقاء فصل الواجبات إلزاميًا.' },
  { key:'central-board-release', role:'CENTRAL_BOARD_MEMBER', action:'RELEASE', objectType:'RELEASE', scope:'GLOBAL', maxRisk:'CRITICAL', maxMateriality:'CRITICAL', description:'إنشاء إصدار محكوم بعد Backtest واعتماد صالح.' },
  { key:'central-board-rollback', role:'CENTRAL_BOARD_MEMBER', action:'ROLLBACK', objectType:'ROLLBACK_REVIEW', scope:'GLOBAL', maxRisk:'CRITICAL', maxMateriality:'CRITICAL', description:'تنفيذ التراجع بعد مراجعة واعتماد مستقل.' },
  { key:'bank-manager-case-review', role:'BANK_MANAGER', action:'REVIEW', objectType:'CASE', scope:'BANK', maxRisk:'HIGH', maxMateriality:'HIGH', description:'مراجعة قضايا البنك ضمن نطاق البنك فقط.' },
  { key:'bank-manager-recommend', role:'BANK_MANAGER', action:'RECOMMEND', objectType:'DECISION', scope:'BANK', maxRisk:'HIGH', maxMateriality:'HIGH', description:'رفع توصية قرار دون امتلاك اعتماد مركزي مطلق.' },
  { key:'committee-chair-review', role:'COMMITTEE_CHAIR', action:'REVIEW', objectType:'CHANGE_PROPOSAL', scope:'COMMITTEE', maxRisk:'HIGH', maxMateriality:'HIGH', description:'مراجعة مقترحات اللجنة ضمن نطاقها.' },
  { key:'committee-member-read', role:'COMMITTEE_MEMBER', action:'READ', objectType:'CASE', scope:'COMMITTEE', maxRisk:'HIGH', maxMateriality:'HIGH', description:'قراءة القضايا الواقعة ضمن اختصاص اللجنة.' },
  { key:'advisor-recommend', role:'ADVISOR', action:'RECOMMEND', objectType:'DECISION', scope:'GLOBAL', maxRisk:'CRITICAL', maxMateriality:'CRITICAL', description:'تقديم توصية فقط؛ سياسة RBAC تمنع المستشار من الاعتماد والإصدار والتراجع.' },
  { key:'auditor-read-audit', role:'AUDITOR', action:'READ', objectType:'AUDIT_EVENT', scope:'GLOBAL', description:'الوصول القرائي لسجل التدقيق.' },
  { key:'auditor-export-audit', role:'AUDITOR', action:'EXPORT', objectType:'AUDIT_EVENT', scope:'GLOBAL', description:'تصدير سجل التدقيق وفق السياسة دون صلاحيات تعديل.' },
  { key:'data-owner-evidence-verify', role:'DATA_OWNER', action:'VERIFY_EVIDENCE', objectType:'EXECUTION_EVIDENCE', scope:'GLOBAL', maxRisk:'CRITICAL', maxMateriality:'CRITICAL', description:'التحقق من الأدلة مع تطبيق فصل مالك الدليل عن المتحقق عندما يكون SoD مطلوبًا.' },
  { key:'monitoring-owner-review-release', role:'MONITORING_OWNER', action:'REVIEW', objectType:'RELEASE', scope:'GLOBAL', maxRisk:'CRITICAL', maxMateriality:'CRITICAL', description:'مراجعة أثر الإصدار ومؤشرات الانحراف دون امتلاك RELEASE تلقائيًا.' },
] as const;

export function getAuthorizationGrantTemplate(key:string):AuthorizationGrantTemplate {
  const template=AUTHORIZATION_GRANT_TEMPLATES.find((item)=>item.key===key);
  if(!template) throw new Error('AUTHORIZATION_TEMPLATE_NOT_FOUND');
  return template;
}
