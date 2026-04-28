import { NextRequest, NextResponse } from 'next/server';
import { captureDistrict } from '@/lib/territory-conquest';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const CaptureSchema = z.object({
  district_id: z.string().min(1).max(200),
});

// AC-15: Capture district for user's squad
export async function POST(request: NextRequest) {
  try {
    let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
    const parsed = CaptureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { district_id } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await captureDistrict(user.id, district_id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
