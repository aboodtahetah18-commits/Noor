import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const html = await readFile(join(process.cwd(), 'public', 'rakaez', 'index.html'), 'utf8');
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return new NextResponse('Rakaez preview file is unavailable', { status: 503 });
  }
}
