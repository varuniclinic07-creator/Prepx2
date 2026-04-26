import { NextResponse } from 'next/server';
import { generateMnemonic } from '@/lib/mnemonic-engine';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ topic: z.string().min(1).max(10000) });

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
  const { topic } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await generateMnemonic(topic);
    await supabase.from('user_notes').insert({
      user_id: user.id, title: `Mnemonic: ${topic.slice(0, 80)}`, body: JSON.stringify(result), tags: ['mnemonic'],
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Generation failed' }, { status: 500 });
  }
}
