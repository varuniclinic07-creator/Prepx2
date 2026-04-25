import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic_id } = await req.json()
  if (!topic_id) return NextResponse.json({ error: 'Missing topic_id' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  // Fetch or create today's plan
  const { data: existing } = await supabase
    .from('daily_plans')
    .select('id,tasks')
    .eq('user_id', user.id)
    .eq('plan_date', today)
    .single()

  const tasks = existing?.tasks || []
  tasks.push({ topic_id, type: 'read', duration: 20, status: 'pending' })

  const { data, error } = await supabase
    .from('daily_plans')
    .upsert({
      id: existing?.id,
      user_id: user.id,
      plan_date: today,
      tasks,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}
