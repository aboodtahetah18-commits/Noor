export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ code: 'AUTH_RUNTIME_RETIRED', replacement: '/api/auth-owner/health' }, { status: 410 });
}

export async function POST() {
  return Response.json({ code: 'AUTH_RUNTIME_RETIRED' }, { status: 410 });
}
