import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateMnemonic } from '@/lib/mnemonic-engine';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic } = await req.json().catch(() => ({}));
  if (!topic || typeof topic !== 'string') {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
  }

  try {
    const result = await generateMnemonic(topic);
    // Save to user_notes table if exists, else mnemonic_history
    await supabase.from('user_notes').insert({
      user_id: user.id,
      title: `Mnemonic: ${topic.slice(0, 80)}`,
      body: JSON.stringify(result),
      tags: ['mnemonic'],
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Generation failed' }, { status: 500 });
  }
}
