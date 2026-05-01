import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get('pageSize') ?? 20)));
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Today's plan topics (if any)
  const today = new Date().toISOString().split('T')[0];
  const { data: plan } = await supabase
    .from('daily_plans')
    .select('tasks')
    .eq('user_id', user.id)
    .eq('plan_date', today)
    .maybeSingle();

  const todayTopicIds: string[] = Array.isArray(plan?.tasks)
    ? (plan!.tasks as Array<{ topic_id?: string }>).map(t => t.topic_id).filter((x): x is string => !!x)
    : [];

  // 2. Pull articles linked to those topics. If empty plan, fall back to all
  // recently linked articles ordered by scraped_at desc.
  let articleIds: string[] | null = null;
  if (todayTopicIds.length > 0) {
    const { data: links } = await supabase
      .from('research_topic_links')
      .select('article_id')
      .in('topic_id', todayTopicIds);
    articleIds = Array.from(new Set((links ?? []).map(l => l.article_id as string)));
    if (articleIds.length === 0) articleIds = null; // fall through to global feed
  }

  let q = supabase
    .from('research_articles')
    .select('id, source_id, source_name, source_url, title, summary, scraped_at, status, tags', { count: 'exact' })
    .in('status', ['enriched', 'linked'])
    .order('scraped_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (articleIds) q = q.in('id', articleIds);

  const { data: articles, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. For each article fetch up to 3 linked topics (id+title) for the badge.
  const ids = (articles ?? []).map(a => a.id);
  const linksByArticle = new Map<string, Array<{ id: string; title: string }>>();
  if (ids.length > 0) {
    const { data: links } = await supabase
      .from('research_topic_links')
      .select('article_id, topic_id, topics:topic_id (id, title)')
      .in('article_id', ids)
      .limit(ids.length * 3);
    for (const l of links ?? []) {
      // Supabase typegen returns the join as an array even for single FK, so flatten.
      const raw = (l as { topics?: { id: string; title: string } | { id: string; title: string }[] }).topics;
      const t = Array.isArray(raw) ? raw[0] : raw;
      if (!t) continue;
      const arr = linksByArticle.get(l.article_id as string) ?? [];
      if (arr.length < 3) arr.push({ id: t.id, title: t.title });
      linksByArticle.set(l.article_id as string, arr);
    }
  }

  return NextResponse.json({
    page,
    pageSize,
    total: count ?? 0,
    items: (articles ?? []).map(a => ({
      ...a,
      linkedTopics: linksByArticle.get(a.id as string) ?? [],
    })),
  });
}
