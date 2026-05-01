// GET /api/admin/hermes/status — JSON snapshot of queue depths + last sweeps.
// Used by the admin page (when JS-driven) and by E2E tests.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getHermesStatus } from '@/lib/agents/hermes-dispatch';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const status = await getHermesStatus(supabase);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'status fetch failed' }, { status: 500 });
  }
}
