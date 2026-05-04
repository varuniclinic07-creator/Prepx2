// /api/coach/[guide]/message — POST a user turn, get the guide's reply.
// Inserts both rows (user + guide) into teacher_consultation_turns and
// optionally spawns an imagine-video job when struggle is detected.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import {
  SCOPE_FILTER,
  detectImagineHint,
  runTeacherCoachTurn,
  type GuideType,
} from '@/lib/agents/teacher-coach';

const VALID: GuideType[] = ['prelims', 'mains', 'interview'];

const BodySchema = z.object({
  message: z.string().min(1).max(4000),
  consultationId: z.string().uuid().optional(),
  fallbackTopic: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ guide: string }> }) {
  const { guide } = await params;
  if (!VALID.includes(guide as GuideType)) {
    return NextResponse.json({ error: 'Invalid guide' }, { status: 404 });
  }
  const guideType = guide as GuideType;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 422 });
  }

  // Resolve the active consultation row.
  let consultationId = parsed.data.consultationId;
  if (consultationId) {
    const { data: own } = await supabase.from('teacher_consultations')
      .select('id').eq('id', consultationId).maybeSingle();
    if (!own) consultationId = undefined;
  }
  if (!consultationId) {
    const { data: existing } = await supabase
      .from('teacher_consultations')
      .select('id')
      .eq('guide_type', guideType)
      .eq('status', 'active')
      .maybeSingle();
    if (existing) {
      consultationId = existing.id;
    } else {
      const { data: created, error: cErr } = await supabase.from('teacher_consultations').insert({
        user_id: user.id,
        guide_type: guideType,
        scope_filter: SCOPE_FILTER[guideType],
      }).select('id').single();
      if (cErr || !created) {
        return NextResponse.json({ error: cErr?.message || 'failed to start consultation' }, { status: 500 });
      }
      consultationId = created.id;
    }
  }

  // Insert the user turn.
  const { error: userInsErr } = await supabase.from('teacher_consultation_turns').insert({
    consultation_id: consultationId,
    role: 'user',
    message: parsed.data.message,
  });
  if (userInsErr) {
    return NextResponse.json({ error: userInsErr.message }, { status: 500 });
  }

  // Pull last 16 turns for context (will be sliced to last 8 inside).
  const { data: history } = await supabase.from('teacher_consultation_turns')
    .select('role, message')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false })
    .limit(16);
  const ordered = (history ?? []).slice().reverse() as { role: 'user' | 'guide'; message: string }[];

  // Imagine-trigger heuristic — fire async (don't block reply).
  const hint = detectImagineHint(parsed.data.message, parsed.data.fallbackTopic);
  let imagineTaskId: string | null = null;
  if (hint.shouldTrigger && hint.topicQuery) {
    try {
      const admin = getAdminClient();
      // Pre-insert the imagine_videos row so the worker can populate it.
      const { data: imagineRow } = await admin.from('imagine_videos').insert({
        user_id: user.id,
        topic_query: hint.topicQuery,
        duration_seconds: 60,
      }).select('id').single();
      const videoId = imagineRow?.id as string | undefined;

      const task = await spawnAgent(admin, {
        agentType: 'imagine',
        userId: user.id,
        payload: { topicQuery: hint.topicQuery, durationSeconds: 60, videoId },
      });
      imagineTaskId = task?.taskId ?? null;
    } catch (err) {
      // Imagine spawn must never block the chat reply.
      imagineTaskId = null;
    }
  }

  // Generate the guide's reply.
  let replyText: string;
  try {
    replyText = await runTeacherCoachTurn(guideType, {
      userMessage: parsed.data.message,
      history: ordered,
      scopeFilter: SCOPE_FILTER[guideType],
    });
  } catch (err: any) {
    replyText = `I hit an issue generating a reply: ${err?.message || 'unknown'}. Please try again.`;
  }

  const replyMetadata: Record<string, unknown> = { guide: guideType };
  if (imagineTaskId) replyMetadata.imagine_task_id = imagineTaskId;
  if (hint.shouldTrigger) replyMetadata.imagine_hint = hint;

  const { data: replyRow } = await supabase.from('teacher_consultation_turns').insert({
    consultation_id: consultationId,
    role: 'guide',
    message: replyText,
    metadata: replyMetadata,
  }).select('id, role, message, metadata, created_at').single();

  return NextResponse.json({
    consultationId,
    reply: replyRow,
    imagineTaskId,
    imagineHint: hint,
  });
}
