import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const checks: Record<string, boolean> = { database: false };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  const healthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      ok: healthy,
      service: 'PrepX',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      healthy,
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
