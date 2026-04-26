import { NextResponse } from 'next/server';
import { generateDailyPlan } from '@/lib/plan-generator';
import { createClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tasks = await generateDailyPlan(user.id);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('daily_plans').upsert({ user_id: user.id, plan_date: today, tasks, status: 'pending' }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: data, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Generation failed' }, { status: 500 });
  }
}
