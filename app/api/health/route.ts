import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'PrepX',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      healthy: true,
    },
    { status: 200 }
  );
}
