import { NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-router';

export async function POST(req: Request) {
  try {
    const { provider } = await req.json().catch(() => ({}));
    const text = await aiChat({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, are you working?' },
      ],
      temperature: 0.3,
      maxTokens: 100,
    });
    return NextResponse.json({ ok: true, message: text.trim() });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[test-ai] Error:', msg);
    return NextResponse.json({ ok: false, message: msg }, { status: 502 });
  }
}
