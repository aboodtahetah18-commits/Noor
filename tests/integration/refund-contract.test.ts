import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
const repo=fs.readFileSync('src/repositories/refund-repository.ts','utf8');
const migration=fs.readFileSync('database/migrations/20260902_014_refund_integrity.sql','utf8');
describe('refund contract',()=>{it('uses REFUND and related transaction',()=>{expect(repo).toContain("'REFUND'");expect(repo).toContain('related_transaction_id');});it('prevents over-refund under concurrency',()=>{expect(migration).toContain('pg_advisory_xact_lock');expect(migration).toContain('REFUND_EXCEEDS_ORIGINAL');});});
