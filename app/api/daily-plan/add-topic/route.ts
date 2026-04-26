import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ topic_id: z.string().uuid() });

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

    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('daily_plans').select('id,tasks').eq('user_id', user.id).eq('plan_date', today).single();
    const tasks = existing?.tasks || [];
    tasks.push({ topic_id, type: 'read', duration: 20, status: 'pending' });
    const { data, error } = await supabase.from('daily_plans').upsert({ id: existing?.id, user_id: user.id, plan_date: today, tasks, status: 'pending' }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
