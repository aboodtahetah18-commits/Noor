import { date, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './financial-schema';

export const algorithmChangeProposals = pgTable('algorithm_change_proposals', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  reviewItemId: text('review_item_id').notNull(),
  dimensionKey: text('dimension_key').notNull(),
  target: text('target').notNull(),
  currentVersion: text('current_version').notNull(),
  candidateVersion: text('candidate_version').notNull(),
  title: text('title').notNull(),
  rationale: text('rationale').notNull(),
  specJson: jsonb('spec_json').notNull(),
  acceptanceCriteriaJson: jsonb('acceptance_criteria_json').notNull(),
  rollbackPlanJson: jsonb('rollback_plan_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const algorithmBacktestRuns = pgTable('algorithm_backtest_runs', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  proposalId: uuid('proposal_id').notNull().references(() => algorithmChangeProposals.id, { onDelete: 'restrict' }),
  baselineVersion: text('baseline_version').notNull(),
  candidateVersion: text('candidate_version').notNull(),
  datasetStartsAt: date('dataset_starts_at').notNull(),
  datasetEndsAt: date('dataset_ends_at').notNull(),
  outcome: text('outcome').notNull(),
  metricsJson: jsonb('metrics_json').notNull(),
  evidenceJson: jsonb('evidence_json').notNull(),
  notes: text('notes'),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const algorithmChangeDecisions = pgTable('algorithm_change_decisions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  proposalId: uuid('proposal_id').notNull().references(() => algorithmChangeProposals.id, { onDelete: 'restrict' }),
  backtestRunId: uuid('backtest_run_id').references(() => algorithmBacktestRuns.id, { onDelete: 'restrict' }),
  decision: text('decision').notNull(),
  rationale: text('rationale').notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
});

export const algorithmReleases = pgTable('algorithm_releases', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  proposalId: uuid('proposal_id').notNull().references(() => algorithmChangeProposals.id, { onDelete: 'restrict' }),
  approvalDecisionId: uuid('approval_decision_id').notNull().references(() => algorithmChangeDecisions.id, { onDelete: 'restrict' }),
  target: text('target').notNull(),
  version: text('version').notNull(),
  previousVersion: text('previous_version').notNull(),
  artifactJson: jsonb('artifact_json').notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }).notNull().defaultNow(),
});

export const algorithmRollbacks = pgTable('algorithm_rollbacks', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  releaseId: uuid('release_id').notNull().references(() => algorithmReleases.id, { onDelete: 'restrict' }),
  fromVersion: text('from_version').notNull(),
  toVersion: text('to_version').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
