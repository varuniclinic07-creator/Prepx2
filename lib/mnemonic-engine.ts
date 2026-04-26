import { aiChat } from './ai-router';

export interface MnemonicResult {
  mnemonic_text: string;
  explanation: string;
  topic: string;
  created_at: string;
}

export async function generateMnemonic(topicOrList: string): Promise<MnemonicResult> {
  const prompt = `You are a creative UPSC study aid that generates memorable mnemonics in Hindi/English mix.

Topic/List: "${topicOrList}"

Create a funny, catchy, easy-to-remember mnemonic to help a UPSC aspirant recall this list/topic. Use wordplay, rhymes, or relatable acronyms.

Return ONLY a JSON object with:
{
  "mnemonic_text": "<memorable mnemonic text>",
  "explanation": "<brief explanation of how the mnemonic works>"
}`;

  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: 'You are a creative mnemonic generator for UPSC aspirants. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      jsonMode: true,
      temperature: 0.7,
      maxTokens: 600,
    });
    const parsed = JSON.parse(raw);
    return {
      mnemonic_text: parsed.mnemonic_text || 'No mnemonic generated.',
      explanation: parsed.explanation || '',
      topic: topicOrList,
      created_at: new Date().toISOString(),
    };
  } catch {
    // Fallback: create acronym from first letters
    const words = topicOrList.split(/[,;]/).map(w => w.trim()).filter(Boolean);
    const firstLetters = words.map(w => w[0]?.toUpperCase() || '').join('');
    return {
      mnemonic_text: `ACRONYM: ${firstLetters}`,
      explanation: `Using first letters of each item: ${firstLetters}. Try making a sentence with these letters!`,
      topic: topicOrList,
      created_at: new Date().toISOString(),
    };
  }
}
