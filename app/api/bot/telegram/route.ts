import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { handleCommand } from '@/lib/telegram-bot';
import { optionalEnv } from '@/lib/env';
import { z } from 'zod';

const TELEGRAM_WEBHOOK_SECRET = optionalEnv('TELEGRAM_WEBHOOK_SECRET', '');

const TelegramUpdateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.number() }),
    text: z.string().min(1).max(4096),
  }).optional(),
});

export async function POST(request: Request) {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const token = request.headers.get('x-telegram-bot-api-secret-token') || '';
    const expected = new Uint8Array(Buffer.from(TELEGRAM_WEBHOOK_SECRET, 'utf8'));
    const received = new Uint8Array(Buffer.from(token, 'utf8'));
    if (expected.byteLength !== received.byteLength || !timingSafeEqual(expected, received)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    console.warn('[Telegram] TELEGRAM_WEBHOOK_SECRET not set — skipping webhook verification');
  }

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
