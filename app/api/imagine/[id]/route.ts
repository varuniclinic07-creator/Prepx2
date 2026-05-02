import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS enforces owner-only; we just surface 404 if the user can't see it.
  const { data, error } = await supabase
    .from('imagine_videos')
    .select('id, user_id, topic_query, syllabus_tag, duration_seconds, voiceover_segments, scene_specs, audio_url, render_status, generated_by, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}
