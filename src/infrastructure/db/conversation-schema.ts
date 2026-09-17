import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export const conversationThreads = pgTable('conversation_threads', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roomKey: text('room_key').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  roomKind: text('room_kind').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversationParticipants = pgTable('conversation_participants', {
  id: uuid('id').primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => conversationThreads.id, { onDelete: 'cascade' }),
  participantKey: text('participant_key').notNull(),
  displayName: text('display_name').notNull(),
  participantType: text('participant_type').notNull(),
  roleLabel: text('role_label'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => conversationThreads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  senderType: text('sender_type').notNull(),
  senderKey: text('sender_key'),
  senderName: text('sender_name').notNull(),
  messageKind: text('message_kind').notNull().default('message'),
  body: text('body').notNull(),
  structuredData: jsonb('structured_data').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversationAttachments = pgTable('conversation_attachments', {
  id: uuid('id').primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => conversationThreads.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').references(() => conversationMessages.id, { onDelete: 'set null' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  contentType: text('content_type'),
  storageKey: text('storage_key').notNull(),
  verificationStatus: text('verification_status').notNull().default('PENDING_REVIEW'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversationLinks = pgTable('conversation_links', {
  id: uuid('id').primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => conversationThreads.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').references(() => conversationMessages.id, { onDelete: 'set null' }),
  linkType: text('link_type').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
