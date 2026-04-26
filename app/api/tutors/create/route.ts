import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { aiChat } from '@/lib/ai-router';

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from('ai_tutors').select('*').eq('approved', true).order('subscriber_count', { ascending: false });
  return NextResponse.json({ tutors: data || [] });
}

export async function POST(req: Request) {
  const { name, description, notes, subject } = await req.json() as {
    name: string; description: string; notes: string; subject: string;
  };
  if (!name || !notes) return NextResponse.json({ error: 'Name and notes required' }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role === 'aspirant') {
    return NextResponse.json({ error: 'Only verified rankers can create tutors' }, { status: 403 });
  }

  const persona = await aiChat({
    messages: [
      { role: 'system', content: 'You analyze UPSC strategy notes and create an AI teaching persona prompt. Return ONLY the persona prompt text.' },
      { role: 'user', content: `Notes:\n${notes}\n\nDescription: ${description}\nCreate a persona_prompt that teaches like this person.` },
    ],
    temperature: 0.5,
    maxTokens: 1500,
  });

  const { data: tutor } = await supabase.from('ai_tutors').insert({
    creator_user_id: user.id, name, description, persona_prompt: persona, subject: subject || 'polity', price: 499, approved: false,
  }).select().single();

  return NextResponse.json({ tutor });
}

export async function PATCH(req: Request) {
  const { id, approved } = await req.json() as { id: string; approved: boolean };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('ai_tutors').update({ approved }).eq('id', id);
  return NextResponse.json({ ok: true });
}
