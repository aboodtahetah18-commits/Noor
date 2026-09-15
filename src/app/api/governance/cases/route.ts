import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listGovernanceCaseContracts } from '@/repositories/governance-case-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get('limit') ?? 50);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 50;

  try {
    const cases = await listGovernanceCaseContracts(user.id, limit);
    return NextResponse.json(
      { cases },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'SYSTEM' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
