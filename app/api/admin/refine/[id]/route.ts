// PATCH /api/admin/refine/[id]
// Body: { action: 'approve'|'reject'|'regenerate', notes? }
//
// approve     → mark audit approved + downstream publish/approve action
//               - smart_book_chapter → chapters.status = 'published'
//               - lecture_script     → video_scripts.status = 'approved' + queue render
//               - research_article   → no-op (already enriched/linked)
//               - quiz_question      → no-op (no dedicated table yet)
// reject      → mark audit rejected + flip artifact's own status to 'rejected'
// regenerate  → mark audit decision + enqueue the appropriate generator agent
//               (content-job for chapters, script-job for scripts; articles +
//               quiz questions are no-ops — natural refresh / future schema).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const ACTIONS = new Set(['approve', 'reject', 'regenerate']);

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const { data: profile } = await sb.from('users').select('role, id').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Forbidden' };
  return { ok: true as const, userId: user.id };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  const notes = (typeof body?.notes === 'string' ? body.notes.trim() : '').slice(0, 2000) || null;

  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: 'action must be approve|reject|regenerate' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: audit, error: fetchErr } = await admin.from('artifact_quality_audits')
    .select('id, artifact_type, artifact_id, status, retrigger_count')
    .eq('id', id).maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!audit) return NextResponse.json({ error: 'audit not found' }, { status: 404 });

  const sideEffects: Record<string, any> = {};

  if (action === 'approve') {
    if (audit.artifact_type === 'smart_book_chapter') {
      const { error: cErr } = await admin.from('chapters').update({
        status: 'published',
        approved_by: auth.userId,
        approved_at: new Date().toISOString(),
        rejected_reason: null,
      }).eq('id', audit.artifact_id);
      if (cErr) return NextResponse.json({ error: `chapter publish failed: ${cErr.message}` }, { status: 500 });
      sideEffects.chapterStatus = 'published';
    } else if (audit.artifact_type === 'lecture_script') {
      const { data: scriptRow } = await admin.from('video_scripts').select('id, status').eq('id', audit.artifact_id).maybeSingle();
      if (scriptRow) {
        await admin.from('video_scripts').update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: auth.userId,
        }).eq('id', audit.artifact_id);
        const queued = await spawnAgent(admin, {
          agentType: 'render',
          payload: { source: 'refine-approve', scriptId: audit.artifact_id },
          priority: 4,
        });
        sideEffects.scriptStatus = 'approved';
        sideEffects.renderTaskId = queued.taskId;
      } else {
        sideEffects.warning = 'video_scripts row not found — audit approved without script flip';
      }
    } else if (audit.artifact_type === 'research_article') {
      sideEffects.note = 'research_article approve is audit-only';
    } else {
      sideEffects.note = 'quiz_question approve is audit-only (no dedicated table)';
    }

    const { error: updErr } = await admin.from('artifact_quality_audits').update({
      status: 'approved',
      admin_decision: 'approve',
      admin_user_id: auth.userId,
      admin_notes: notes,
      decided_at: new Date().toISOString(),
    }).eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: 'approved', ...sideEffects });
  }

  if (action === 'reject') {
    if (audit.artifact_type === 'smart_book_chapter') {
      await admin.from('chapters').update({
        status: 'rejected',
        rejected_reason: notes || 'rejected via refine queue',
      }).eq('id', audit.artifact_id);
      sideEffects.chapterStatus = 'rejected';
    } else if (audit.artifact_type === 'lecture_script') {
      await admin.from('video_scripts').update({ status: 'failed' }).eq('id', audit.artifact_id);
      sideEffects.scriptStatus = 'failed';
    } else if (audit.artifact_type === 'research_article') {
      // research_articles has no rejected_reason column — set status if it exists
      const { error: rErr } = await admin.from('research_articles').update({ status: 'rejected' }).eq('id', audit.artifact_id);
      if (rErr) {
        // status column may not exist; not fatal — audit-level rejection is enough.
        sideEffects.note = `research_articles row not flipped: ${rErr.message}`;
      } else {
        sideEffects.articleStatus = 'rejected';
      }
    } else {
      sideEffects.note = 'quiz_question reject is audit-only';
    }

    const { error: updErr } = await admin.from('artifact_quality_audits').update({
      status: 'rejected',
      admin_decision: 'reject',
      admin_user_id: auth.userId,
      admin_notes: notes,
      decided_at: new Date().toISOString(),
    }).eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: 'rejected', ...sideEffects });
  }

  // regenerate
  if (audit.artifact_type === 'smart_book_chapter') {
    const { data: chapterRow } = await admin.from('chapters').select('topic_id').eq('id', audit.artifact_id).maybeSingle();
    if (!chapterRow?.topic_id) {
      return NextResponse.json({ error: 'cannot regenerate chapter — topic_id not found' }, { status: 409 });
    }
    const queued = await spawnAgent(admin, {
      agentType: 'content',
      payload: {
        source: 'refine-regenerate',
        topicId: chapterRow.topic_id,
        reason: 'regenerate-after-refine',
      },
      priority: 3,
    });
    sideEffects.regenerateTaskId = queued.taskId;
  } else if (audit.artifact_type === 'lecture_script') {
    const { data: scriptRow } = await admin.from('video_scripts').select('topic_id, language, duration_target_seconds').eq('id', audit.artifact_id).maybeSingle();
    if (!scriptRow?.topic_id) {
      return NextResponse.json({ error: 'cannot regenerate script — topic_id not found' }, { status: 409 });
    }
    const queued = await spawnAgent(admin, {
      agentType: 'script',
      payload: {
        source: 'refine-regenerate',
        topicId: scriptRow.topic_id,
        durationMinutes: Math.max(15, Math.round((scriptRow.duration_target_seconds || 1800) / 60)),
        language: scriptRow.language || 'en',
        reason: 'regenerate-after-refine',
      },
      priority: 3,
    });
    sideEffects.regenerateTaskId = queued.taskId;
  } else {
    sideEffects.note = `regenerate is a no-op for ${audit.artifact_type} — natural refresh / awaiting schema.`;
  }

  const { error: updErr } = await admin.from('artifact_quality_audits').update({
    admin_decision: 'regenerate',
    admin_user_id: auth.userId,
    admin_notes: notes,
    decided_at: new Date().toISOString(),
  }).eq('id', id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: 'regenerate', ...sideEffects });
}
