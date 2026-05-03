// Sprint 5 part-2: Chanakya AI Strategist endpoint. Reads the cached row from
// `study_recommendations` if fresh (<24h); otherwise re-runs diagnoseUser()
// and persists the result. The dashboard card hits this on mount so the
// page stays SSR-fast and the LLM is never called inline during render.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { diagnoseUser } from '@/lib/agents/strategist';

const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const { data: cached } = await admin
    .from('study_recommendations')
    .select('headline, diagnosis, action_steps, focus_subjects, confidence, expires_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const fresh = cached?.expires_at && new Date(cached.expires_at).getTime() > Date.now();
  if (fresh && cached?.headline) {
    return NextResponse.json({
      diagnose: {
        headline: cached.headline,
        diagnosis: cached.diagnosis,
        action_steps: cached.action_steps ?? [],
        focus_subjects: cached.focus_subjects ?? [],
        confidence: cached.confidence ?? 0.5,
      },
      cached: true,
    });
  }

  const diagnose = await diagnoseUser(user.id);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  await admin.from('study_recommendations').insert({
    user_id: user.id,
    headline: diagnose.headline,
    diagnosis: diagnose.diagnosis,
    action_steps: diagnose.action_steps,
    focus_subjects: diagnose.focus_subjects,
    confidence: diagnose.confidence,
    source_window_days: 30,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ diagnose, cached: false });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const diagnose = await diagnoseUser(user.id);
  const admin = getAdminClient();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  await admin.from('study_recommendations').insert({
    user_id: user.id,
    headline: diagnose.headline,
    diagnosis: diagnose.diagnosis,
    action_steps: diagnose.action_steps,
    focus_subjects: diagnose.focus_subjects,
    confidence: diagnose.confidence,
    source_window_days: 30,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ diagnose, cached: false });
}
