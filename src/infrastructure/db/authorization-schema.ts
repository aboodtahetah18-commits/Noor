import { boolean, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './financial-schema';

export const authorizationRoleAssignments = pgTable('authorization_role_assignments', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  role: text('role').notNull(),
  bankKey: text('bank_key'),
  committeeId: text('committee_id'),
  serviceId: text('service_id'),
  status: text('status').notNull().default('ACTIVE'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authorizationGrants = pgTable('authorization_grants', {
  id: uuid('id').primaryKey(),
  role: text('role').notNull(),
  action: text('action').notNull(),
  objectType: text('object_type').notNull(),
  bankKey: text('bank_key'),
  committeeId: text('committee_id'),
  caseType: text('case_type'),
  maxRisk: text('max_risk'),
  maxMateriality: text('max_materiality'),
  maxAmount: numeric('max_amount', { precision: 18, scale: 2 }),
  policyVersion: text('policy_version').notNull().default('RBAC_ABAC_v1.0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authorizationDelegations = pgTable('authorization_delegations', {
  id: uuid('id').primaryKey(),
  fromUserId: uuid('from_user_id').references(() => profiles.id, { onDelete: 'restrict' }),
  fromRole: text('from_role').notNull(),
  toUserId: uuid('to_user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  toRole: text('to_role').notNull(),
  permissionsJson: jsonb('permissions_json').notNull(),
  scopeJson: jsonb('scope_json').notNull(),
  maxAmount: numeric('max_amount', { precision: 18, scale: 2 }),
  maxRisk: text('max_risk'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  canRedelegate: boolean('can_redelegate').notNull().default(false),
  approvedBy: uuid('approved_by').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authorizationEvents = pgTable('authorization_events', {
  id: uuid('id').primaryKey(),
  actorUserId: uuid('actor_user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  role: text('role').notNull(),
  action: text('action').notNull(),
  objectType: text('object_type').notNull(),
  objectId: text('object_id').notNull(),
  caseId: text('case_id'),
  bankKey: text('bank_key'),
  committeeId: text('committee_id'),
  policyVersion: text('policy_version').notNull(),
  decision: text('decision').notNull(),
  reason: text('reason').notNull(),
  matchedGrantId: uuid('matched_grant_id'),
  requestId: text('request_id').notNull(),
  contextJson: jsonb('context_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
