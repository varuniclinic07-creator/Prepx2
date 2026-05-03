// Territory Conquest API — get map state, capture districts.
// Sprint 4-3.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { captureDistrict } from '@/lib/territory-conquest';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .rpc('get_district_conquest_state');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const districts = (data || []).map((d: any) => ({
    districtId: d.district_id,
    districtName: d.district_name,
    stateName: d.state_name,
    ownerSquadId: d.owner_squad_id,
    ownerSquadName: d.owner_squad_name,
    captureCount: d.capture_count || 0,
    capturedAt: d.captured_at,
    centerLat: d.center_lat,
    centerLng: d.center_lng,
  }));

  return NextResponse.json({ districts });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { districtId } = await req.json();
  if (!districtId) {
    return NextResponse.json({ error: 'districtId required' }, { status: 400 });
  }

  const result = await captureDistrict(user.id, districtId);
  return NextResponse.json(result);
}
