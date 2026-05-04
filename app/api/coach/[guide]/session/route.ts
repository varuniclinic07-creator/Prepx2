// /api/coach/[guide]/session — fetch or create the user's active consultation
// for a given guide (prelims | mains | interview), plus its turn history.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { SCOPE_FILTER, type GuideType } from '@/lib/agents/teacher-coach';

const VALID: GuideType[] = ['prelims', 'mains', 'interview'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ guide: string }> }) {
  const { guide } = await params;
  if (!VALID.includes(guide as GuideType)) {
    return NextResponse.json({ error: 'Invalid guide' }, { status: 404 });
  }
  const guideType = guide as GuideType;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let { data: existing } = await supabase
    .from('teacher_consultations')
    .select('id, guide_type, scope_filter, status, created_at, updated_at')
    .eq('guide_type', guideType)
    .eq('status', 'active')
    .maybeSingle();

  if (!existing) {
    const { data: created, error: cErr } = await supabase
      .from('teacher_consultations')
      .insert({
        user_id: user.id,
        guide_type: guideType,
        scope_filter: SCOPE_FILTER[guideType],
      })
      .select('id, guide_type, scope_filter, status, created_at, updated_at')
      .single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    existing = created;
  }

  const { data: turns } = await supabase
    .from('teacher_consultation_turns')
    .select('id, role, message, metadata, created_at')
    .eq('consultation_id', existing!.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    consultation: existing,
    turns: turns ?? [],
  });
}
