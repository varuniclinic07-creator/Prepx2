import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { generateDailyPlan } from '@/lib/plan-generator'

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await generateDailyPlan(user.id)
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_plans')
    .upsert({ user_id: user.id, plan_date: today, tasks, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data, tasks })
}
