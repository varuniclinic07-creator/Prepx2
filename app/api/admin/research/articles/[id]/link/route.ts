import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const Body = z.object({ topicId: z.string().uuid(), score: z.number().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: articleId } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase
    .from('research_topic_links')
    .upsert({
      article_id: articleId,
      topic_id: parsed.data.topicId,
      score: parsed.data.score ?? 1,
      link_type: 'manual',
    }, { onConflict: 'article_id,topic_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Promote article to 'linked' if it was just 'enriched'.
  await supabase
    .from('research_articles')
    .update({ status: 'linked' })
    .eq('id', articleId)
    .eq('status', 'enriched');

  return NextResponse.json({ success: true });
}
