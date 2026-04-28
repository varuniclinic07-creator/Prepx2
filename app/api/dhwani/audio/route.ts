import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { textToSpeech } from '@/lib/ai-router';
import { z } from 'zod';

const AudioSchema = z.object({
  text: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const parsed = AudioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { text } = parsed.data;

    const buffer = await textToSpeech(text.slice(0, 4000));
    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mp3' });
    const arrayBuf = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');

    return NextResponse.json({ audio_base64: base64, mime_type: 'audio/mp3' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'TTS failed' }, { status: 500 });
  }
}
