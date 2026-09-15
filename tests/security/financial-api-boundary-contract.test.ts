import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const mutationRoutes=[
  'src/app/api/financial-engine/run/route.ts',
  'src/app/api/decisions/request/route.ts',
  'src/app/api/decisions/respond/route.ts',
  'src/app/api/execution/report/route.ts',
];
const readRoutes=[
  'src/app/api/financial-engine/current/route.ts',
  'src/app/api/recommendations/route.ts',
  'src/app/api/execution/tasks/route.ts',
];

function source(path:string){return readFileSync(path,'utf8');}

describe('financial API security boundary',()=>{
  it('requires authenticated identity and no-store on every financial route',()=>{
    for(const path of [...mutationRoutes,...readRoutes]){
      const text=source(path);
      expect(text).toContain('getAuthenticatedUser');
      expect(text).toMatch(/['"]Cache-Control['"]\s*:\s*['"]no-store['"]/);
      expect(text).not.toContain('error.message');
    }
  });

  it('requires trusted origin and rate limiting on every financial mutation route',()=>{
    for(const path of mutationRoutes){
      const text=source(path);
      expect(text).toContain('assertTrustedMutationOrigin');
      expect(text).toContain('enforceRateLimit');
    }
  });

  it('does not accept client supplied user identity in request schemas',()=>{
    for(const path of mutationRoutes){
      const text=source(path);
      expect(text).not.toMatch(/userId\s*:\s*z\./);
    }
  });

  it('never lets the user execution-reporting service self-verify execution',()=>{
    const text=source('src/features/financial-engine/services/execution-service.ts');
    expect(text).not.toContain("SET status='VERIFIED_EXECUTION'");
    expect(text).toContain("status='EVIDENCE_PENDING'");
    expect(text).toContain("status='VERIFICATION_PENDING'");
  });
});
