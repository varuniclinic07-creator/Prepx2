export type VoiceSessionState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceIntent {
  intent: 'quiz' | 'rank' | 'mnemonic' | 'chat';
  topic?: string;
  args?: string;
}

export function parseIntent(transcript: string): VoiceIntent {
  const t = transcript.toLowerCase();
  if (t.includes('quiz me on') || t.includes('quiz me about')) {
    const topic = transcript.replace(/quiz me (on|about)/i, '').trim();
    return { intent: 'quiz', topic };
  }
  if (t.includes('what is my rank') || t.includes('my rank') || t.includes('predicted rank')) {
    return { intent: 'rank' };
  }
  if (t.includes('generate mnemonic') || t.includes('mnemonic for')) {
    const topic = transcript.replace(/.*mnemonic (for|about)/i, '').trim();
    return { intent: 'mnemonic', topic };
  }
  return { intent: 'chat' };
}

export async function executeIntent(intent: VoiceIntent, _userId: string): Promise<string> {
  switch (intent.intent) {
    case 'quiz':
      return `Opening quiz on ${intent.topic || 'UPSC'}...`;
    case 'rank':
      return 'Your predicted rank will be shown on the Rank page.';
    case 'mnemonic':
      return `Generating a mnemonic for ${intent.topic || 'UPSC'}...`;
    default:
      return "I didn't catch that. Try saying 'quiz me on Polity' or 'what is my rank'.";
  }
}
