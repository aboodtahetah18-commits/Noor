'use client';

import type { ReactNode } from 'react';

/**
 * Stage 3 responsive_full_platform compatibility boundary.
 *
 * This component intentionally remains mounted because older shell code and
 * tests import it, but it no longer redirects mobile users to /conversations.
 * Protected routing and authorization remain owned by the existing route/auth
 * layers, while every authorized page can now render at mobile widths.
 */
export function MobileConversationGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
