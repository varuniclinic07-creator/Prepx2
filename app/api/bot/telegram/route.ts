import { NextResponse } from 'next/server';
import { handleCommand } from '@/lib/telegram-bot';

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const message = body?.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  try {
    await handleCommand(chatId, command, args);
  } catch (e: any) {
    console.error('[Telegram] Command error:', e?.message);
  }

  return NextResponse.json({ ok: true });
}
