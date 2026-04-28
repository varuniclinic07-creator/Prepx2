import { supabase } from './supabase';
import { optionalEnv } from './env';

const BOT_TOKEN = optionalEnv('TELEGRAM_BOT_TOKEN', '');

async function sendTelegram(chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

export async function handleCommand(chatId: string, command: string, args: string[]) {
  switch (command) {
    case '/start': {
      await sendTelegram(chatId, '👋 Welcome to <b>PrepX Bot</b>!\n\nUse /link &lt;your-email&gt; to connect your account.\n\nCommands:\n/quiz — Get 5 random UPSC questions\n/fact — Daily fact\n/plan — Your today\'s tasks\n/rank — Your predicted rank');
      break;
    }

    case '/link': {
      const email = args[0]?.trim();
      if (!email) {
        await sendTelegram(chatId, 'Usage: /link &lt;your-email&gt;');
        break;
      }
      const { data: user } = await supabase.from('users').select('id, email').ilike('email', `%${email}%`).limit(1).single();
      if (!user) {
        await sendTelegram(chatId, 'Account not found. Please ensure you registered with the same email on PrepX.');
        break;
      }
      await supabase.from('user_telegrams').upsert({ user_id: user.id, chat_id: chatId });
      await sendTelegram(chatId, `✅ Linked to <b>${user.email}</b>. You can now use /quiz, /fact, /plan, and /rank.`);
      break;
    }

    case '/quiz': {
      const { data: quizzes } = await supabase.from('quizzes').select('questions').limit(5);
      if (!quizzes || quizzes.length === 0) {
        await sendTelegram(chatId, 'No quizzes available right now. Try again later!');
        break;
      }
      let text = '<b>📝 Random Quiz</b>\n\n';
      let qNum = 1;
      for (const qz of quizzes) {
        const qs = (qz.questions || []).slice(0, 1);
        for (const q of qs) {
          text += `<b>Q${qNum}:</b> ${q.question}\n`;
          q.options.forEach((o: string, i: number) => {
            text += `${String.fromCharCode(65 + i)}) ${o}\n`;
          });
          text += `\nAnswer: <span class="tg-spoiler">${q.correct_option}</span>\n\n`;
          qNum++;
        }
      }
      await sendTelegram(chatId, text);
      break;
    }

    case '/fact': {
      const { data: topics } = await supabase.from('topics').select('title, content').limit(1);
      if (!topics || topics.length === 0) {
        await sendTelegram(chatId, 'No fact available right now.');
        break;
      }
      const topic = topics[0];
      const summary = topic.content?.summary || topic.content?.key_concepts?.[0]?.body || 'Stay curious!';
      await sendTelegram(chatId, `<b>💡 Fact of the Day</b>\n\n<b>${topic.title}</b>\n${summary.slice(0, 400)}`);
      break;
    }

    case '/plan': {
      const { data: link } = await supabase.from('user_telegrams').select('user_id').eq('chat_id', chatId).single();
      if (!link) {
        await sendTelegram(chatId, 'Please /link your account first.');
        break;
      }
      const today = new Date().toISOString().split('T')[0];
      const { data: plan } = await supabase.from('daily_plans').select('tasks').eq('user_id', link.user_id).eq('plan_date', today).single();
      if (!plan) {
        await sendTelegram(chatId, 'No plan for today yet. Log into PrepX to generate one!');
        break;
      }
      let text = '<b>📅 Today\'s Plan</b>\n\n';
      (plan.tasks || []).forEach((t: any, i: number) => {
        text += `${i + 1}. [${t.status}] ${t.type.toUpperCase()} — ${t.duration} min\n`;
      });
      await sendTelegram(chatId, text);
      break;
    }

    case '/rank': {
      const { data: link } = await supabase.from('user_telegrams').select('user_id').eq('chat_id', chatId).single();
      if (!link) {
        await sendTelegram(chatId, 'Please /link your account first.');
        break;
      }
      const { data: pred } = await supabase.from('user_predictions').select('predicted_rank_min, predicted_rank_max, confidence_pct').eq('user_id', link.user_id).order('created_at', { ascending: false }).limit(1).single();
      if (!pred) {
        await sendTelegram(chatId, 'No prediction yet. Take more quizzes to get ranked!');
        break;
      }
      await sendTelegram(chatId, `<b>🔮 Predicted Rank</b>\n\nRank Range: <b>${pred.predicted_rank_min} – ${pred.predicted_rank_max}</b>\nConfidence: ${pred.confidence_pct}%`);
      break;
    }

    default: {
      await sendTelegram(chatId, 'Unknown command. Use /start for help.');
    }
  }
}

export async function broadcastMessage(text: string) {
  if (!BOT_TOKEN) return { sent: 0 };
  const { data: links } = await supabase.from('user_telegrams').select('chat_id');
  let sent = 0;
  for (const row of links || []) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: row.chat_id, text, parse_mode: 'HTML' }),
      });
      sent++;
    } catch {}
  }
  return { sent };
}
