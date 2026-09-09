import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Phase 24 source contract',()=>{
  it('does not grant AI database access or financial write authority',()=>{
    const ai=fs.readFileSync('src/features/recommendations/ai/get-advisor-explanation.ts','utf8');
    const provider=fs.readFileSync('src/ai/openai-provider.ts','utf8');
    expect(ai).not.toContain('rawSql');
    expect(provider).not.toContain('DATABASE_URL');
    expect(provider).not.toContain('UPDATE ');
    expect(provider).toContain('Structured Facts');
  });
  it('keeps AI optional in environment configuration',()=>{
    const env=fs.readFileSync('.env.example','utf8');
    expect(env).toContain('OPENAI_API_KEY=');
    expect(env).toContain('Financial operations remain fully usable');
  });
});
