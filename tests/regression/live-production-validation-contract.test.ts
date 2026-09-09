import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('live production validation contract', () => {
  const live = read('scripts/live-production-validation.mjs');

  it('checks production liveness, readiness and owner auth health', () => {
    expect(live).toContain("'/api/health'");
    expect(live).toContain("'/api/ready'");
    expect(live).toContain("'/api/auth-owner/health'");
    expect(live).toContain("readyBody?.database === 'reachable'");
  });

  it('proves protected pages do not expose unauthenticated content', () => {
    for (const route of ['/dashboard', '/transactions', '/expenses', '/accounts', '/advisor', '/reports', '/settings']) {
      expect(live).toContain(`'${route}'`);
    }
    expect(live).toContain("location.includes('/login')");
  });

  it('keeps security probes non-destructive', () => {
    expect(live).toContain("hostileOrigin = 'https://invalid-origin.example'");
    expect(live).toContain("blockedLogin.status === 403");
    expect(live).toContain("blockedRegister.status === 403");
    expect(live).toContain("AUTH_ORIGIN_REJECTED");
  });
});
