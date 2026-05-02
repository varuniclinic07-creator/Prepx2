// Mark a CA bundle article as read (POST) or undo (DELETE).
// RLS enforces user_id = auth.uid() on inserts/deletes; we still pass the
// authenticated user_id through the supabase-server client so RLS can
// validate. The bundle_id and article_id are validated by FK + RLS read
// policy (must be a published bundle the user can SELECT).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getUser } from '@/lib/auth';

type Body = {
  bundleId?: string;
  articleId?: string;
};

function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!isUuid(body.bundleId) || !isUuid(body.articleId)) {
    return NextResponse.json({ error: 'bundleId and articleId must be uuids' }, { status: 400 });
  }

  const sb = await createClient();
  const { error } = await sb
    .from('ca_bundle_reads')
    .upsert(
      {
        user_id: user.id,
        bundle_id: body.bundleId,
        article_id: body.articleId,
      },
      { onConflict: 'user_id,bundle_id,article_id', ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!isUuid(body.bundleId) || !isUuid(body.articleId)) {
    return NextResponse.json({ error: 'bundleId and articleId must be uuids' }, { status: 400 });
  }

  const sb = await createClient();
  const { error } = await sb
    .from('ca_bundle_reads')
    .delete()
    .eq('user_id', user.id)
    .eq('bundle_id', body.bundleId)
    .eq('article_id', body.articleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
