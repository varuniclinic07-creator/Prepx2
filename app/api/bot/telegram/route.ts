import { NextResponse } from 'next/server';
import { handleCommand } from '@/lib/telegram-bot';
import { z } from 'zod';

const TelegramUpdateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.number() }),
    text: z.string().min(1).max(4096),
  }).optional(),
});

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const parsed = TelegramUpdateSchema.safeParse(body);
  if (!parsed.success || !parsed.data.message?.text) return NextResponse.json({ ok: true });

  const chatId = String(parsed.data.message.chat.id);
  const text = parsed.data.message.text.trim();
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
