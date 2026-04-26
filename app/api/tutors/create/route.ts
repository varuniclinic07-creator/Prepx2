import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { aiChat } from '@/lib/ai-router';
import { z } from 'zod';

const PostSchema = z.object({ name: z.string().min(1).max(200), description: z.string().max(5000), notes: z.string().min(1).max(10000), subject: z.string().optional() });
const PatchSchema = z.object({ id: z.string().uuid(), approved: z.boolean() });

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('ai_tutors').select('*').eq('approved', true).order('subscriber_count', { ascending: false });
    return NextResponse.json({ tutors: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = PostSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { name, description, notes, subject } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role === 'aspirant') return NextResponse.json({ error: 'Only verified rankers can create tutors' }, { status: 403 });

    const persona = await aiChat({ messages: [ { role: 'system', content: 'You analyze UPSC strategy notes and create an AI teaching persona prompt. Return ONLY the persona prompt text.' }, { role: 'user', content: `Notes:\n${notes}\n\nDescription: ${description}\nCreate a persona_prompt that teaches like this person.` }, ], temperature: 0.5, maxTokens: 1500 });
    const { data: tutor } = await supabase.from('ai_tutors').insert({ creator_user_id: user.id, name, description, persona_prompt: persona, subject: subject || 'polity', price: 499, approved: false }).select().single();
    return NextResponse.json({ tutor });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { id, approved } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await supabase.from('ai_tutors').update({ approved }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
