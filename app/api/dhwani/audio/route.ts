import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { textToSpeech } from '@/lib/ai-router';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { text } = body;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const buffer = await textToSpeech(text.slice(0, 4000));
    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mp3' });
    const arrayBuf = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');

    return NextResponse.json({ audio_base64: base64, mime_type: 'audio/mp3' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'TTS failed' }, { status: 500 });
  }
}
