import type { NextConfig } from 'next';

const isPreviewBuild = process.env.PREVIEW_MODE === 'true';
const isDevelopment = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ...(process.env.APP_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const privateNoStore = { key: 'Cache-Control', value: 'private, no-store, max-age=0' };

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: isPreviewBuild },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/dashboard/:path*', headers: [privateNoStore] },
      { source: '/accounts/:path*', headers: [privateNoStore] },
      { source: '/transactions/:path*', headers: [privateNoStore] },
      { source: '/budget/:path*', headers: [privateNoStore] },
      { source: '/obligations/:path*', headers: [privateNoStore] },
      { source: '/savings/:path*', headers: [privateNoStore] },
      { source: '/emergency/:path*', headers: [privateNoStore] },
      { source: '/goals/:path*', headers: [privateNoStore] },
      { source: '/advisor/:path*', headers: [privateNoStore] },
      { source: '/reports/:path*', headers: [privateNoStore] },
      { source: '/settings/:path*', headers: [privateNoStore] },
      { source: '/onboarding/:path*', headers: [privateNoStore] },
      { source: '/cycles/:path*', headers: [privateNoStore] },
      { source: '/income/:path*', headers: [privateNoStore] },
      { source: '/expenses/:path*', headers: [privateNoStore] },
      { source: '/api/jobs/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
