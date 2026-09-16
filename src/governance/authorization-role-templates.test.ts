import { describe, expect, it } from 'vitest';
import {
  AUTHORIZATION_ROLE_TEMPLATES,
  assertTemplateScope,
  getAuthorizationRoleTemplate,
} from './authorization-role-templates';

describe('authorization role templates', () => {
  it('never grants ADMINISTER through an operating template', () => {
    for (const template of Object.values(AUTHORIZATION_ROLE_TEMPLATES)) {
      expect(template.grants.some((grant) => grant.action === 'ADMINISTER')).toBe(false);
    }
  });

  it('requires an explicit bank scope for BANK_MANAGER', () => {
    const template = getAuthorizationRoleTemplate('BANK_MANAGER');
    expect(() => assertTemplateScope(template, {})).toThrow('AUTHORIZATION_TEMPLATE_BANK_SCOPE_REQUIRED');
    expect(() => assertTemplateScope(template, { bankKey: 'SOLVENCY' })).not.toThrow();
  });

  it('requires an explicit committee scope for committee templates', () => {
    for (const key of ['COMMITTEE_CHAIR','COMMITTEE_MEMBER']) {
      const template = getAuthorizationRoleTemplate(key);
      expect(() => assertTemplateScope(template, {})).toThrow('AUTHORIZATION_TEMPLATE_COMMITTEE_SCOPE_REQUIRED');
      expect(() => assertTemplateScope(template, { committeeId: 'RISK_COMMITTEE' })).not.toThrow();
    }
  });

  it('keeps global templates free from artificial scope requirements', () => {
    expect(() => assertTemplateScope(getAuthorizationRoleTemplate('AUDITOR'), {})).not.toThrow();
    expect(() => assertTemplateScope(getAuthorizationRoleTemplate('CENTRAL_BOARD_MEMBER'), {})).not.toThrow();
  });
});
