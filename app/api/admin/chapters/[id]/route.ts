// PATCH /api/admin/chapters/[id]
// Body: { action: 'approve' | 'reject', reason? }
// approve → status='published' (single-hop per spec; admin approval = publish)
// reject  → status='rejected' with rejected_reason

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';

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
  const action: string | undefined = body?.action;
  const reason: string | undefined = body?.reason;

  if (!['approve', 'reject'].includes(action || '')) {
    return NextResponse.json({ error: 'action must be approve|reject' }, { status: 400 });
  }
  if (action === 'reject' && (!reason || reason.trim().length === 0)) {
    return NextResponse.json({ error: 'reason required when rejecting' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: chapter, error: fetchErr } = await admin.from('chapters')
    .select('id, status').eq('id', id).maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!chapter) return NextResponse.json({ error: 'chapter not found' }, { status: 404 });

  if (action === 'approve') {
    if (!['generated_pending_approval', 'approved', 'draft'].includes(chapter.status)) {
      return NextResponse.json({
        error: `cannot approve from status ${chapter.status}`,
      }, { status: 409 });
    }
    const { error: updErr } = await admin.from('chapters').update({
      status: 'published',
      approved_by: auth.userId,
      approved_at: new Date().toISOString(),
      rejected_reason: null,
    }).eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'published' });
  }

  // reject
  const { error: updErr } = await admin.from('chapters').update({
    status: 'rejected',
    rejected_reason: reason!.trim().slice(0, 1000),
  }).eq('id', id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: 'rejected' });
}
