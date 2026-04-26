import { NextRequest, NextResponse } from 'next/server';
import { captureDistrict } from '@/lib/territory-conquest';
import { createClient } from '@/lib/supabase-server';

// AC-15: Capture district for user's squad
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { district_id } = body;
    if (!district_id) return NextResponse.json({ error: 'district_id required' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await captureDistrict(user.id, district_id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
