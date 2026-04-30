import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ topic_id: z.string().uuid() });

const MAX_TASKS_PER_PLAN = 20;

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { topic_id } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify topic exists to prevent injection of arbitrary UUIDs into the plan
    const { data: topicRow } = await supabase.from('topics').select('id').eq('id', topic_id).maybeSingle();
    if (!topicRow) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('daily_plans')
      .select('id,tasks')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle();

    // Clone the array to avoid in-place mutation of cached / Supabase response objects.
    const existingTasks = Array.isArray(existing?.tasks) ? existing!.tasks : [];
    if (existingTasks.length >= MAX_TASKS_PER_PLAN) {
      return NextResponse.json({ error: `Plan already has ${MAX_TASKS_PER_PLAN} tasks (max)` }, { status: 400 });
    }
    // Idempotent: skip if topic already in plan as a 'read' task.
    const alreadyAdded = existingTasks.some((t: any) => t?.topic_id === topic_id && t?.type === 'read');
    const tasks = alreadyAdded
      ? [...existingTasks]
      : [...existingTasks, { topic_id, type: 'read' as const, duration: 20, status: 'pending' as const }];

    const upsertPayload: Record<string, unknown> = {
      user_id: user.id,
      plan_date: today,
      tasks,
      status: 'pending',
    };
    if (existing?.id) upsertPayload.id = existing.id;

    const { data, error } = await supabase
      .from('daily_plans')
      .upsert(upsertPayload, { onConflict: 'user_id,plan_date' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
