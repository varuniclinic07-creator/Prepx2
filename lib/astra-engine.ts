import { aiChat } from './ai-router';

export interface AstraFrame {
  timestamp: number; // seconds
  speaker_text: string;
  visual_hint: string;
  key_concept: string;
}

export interface AstraScript {
  topic: string;
  subject: string;
  frames: AstraFrame[];
  language: string;
}

export async function generateAstraScript(
  topic: string,
  language: string = 'en'
): Promise<AstraScript> {
  // AC-01: Structured prompt to AI router for lecture script
  const systemPrompt = `You are an expert UPSC CSE educator. Generate a 3-minute lecture script (~450-500 words) on the given topic. Return STRICT JSON with this exact shape:
{
  "frames": [
    {"timestamp": 0, "speaker_text": " brief intro", "visual_hint": "display title card", "key_concept": "Topic Name"},
    {"timestamp": 15, "speaker_text": "...", "visual_hint": "...", "key_concept": "..."},
    ...
  ]
}
Rules: 8-12 frames total. Each frame ~20-45 seconds. Include visual_hint for each frame suggesting text overlay or diagram placeholder. Keep speaker_text in ${language === 'hi' ? 'Hindi' : 'English'}.`;

  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: ${topic}` },
      ],
      temperature: 0.4,
      maxTokens: 3000,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const frames = (parsed.frames || parsed).map((f: any, idx: number) => ({
      timestamp: typeof f.timestamp === 'number' ? f.timestamp : idx * 20,
      speaker_text: String(f.speaker_text || ''),
      visual_hint: String(f.visual_hint || ''),
      key_concept: String(f.key_concept || ''),
    }));

    return {
      topic,
      subject: 'polity', // infer or default
      frames,
      language,
    };
  } catch (err) {
    // AC-02: Fallback if AI unavailable — generate from template
    console.error('[Astra Engine] AI failure, using fallback:', err);
    return {
      topic,
      subject: 'polity',
      frames: generateFallbackFrames(topic, language),
      language,
    };
  }
}

function generateFallbackFrames(topic: string, language: string): AstraFrame[] {
  const lang = language === 'hi' ? 'hi' : 'en';
  const templates: Record<string, string[]> = {
    en: [
      `Welcome. Today we study ${topic}.`,
      `Understanding ${topic} is essential for UPSC CSE.`,
      `Let us start with the historical context.`,
      `Key provisions and their significance.`,
      `Relevant case studies and current affairs links.`,
      `Common misconceptions aspirants face.`,
      `Summary of key takeaways.`,
      `Thank you. Practice MCQs to reinforce.`,
    ],
    hi: [
      `स्वागत है। आज हम ${topic} अध्ययन करेंगे।`,
      `${topic} की समझ यूपीएससी के लिए अनिवार्य है।`,
      `आइए ऐतिहासिक संदर्भ से शुरुआत करें।`,
      `मुख्य प्रावधान और उनका महत्व।`,
      `प्रासंगिक केस स्टडी और करंट अफेयर्स।`,
      `उम्मीदवारों की आम गलतफहमियां।`,
      `मुख्य निष्कर्षों का सारांश।`,
      `धन्यवाद। पुष्टि के लिए MCQs अभ्यास करें।`,
    ],
  };
  const texts = templates[lang] || templates.en;
  return texts.map((text, idx) => ({
    timestamp: idx * 22,
    speaker_text: text,
    visual_hint: idx === 0 ? 'Title card' : idx % 2 === 0 ? 'Bullet list overlay' : 'Diagram placeholder',
    key_concept: topic,
  }));
}
