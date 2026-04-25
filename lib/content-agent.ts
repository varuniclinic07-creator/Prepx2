import { aiChat } from './ai-router';

const DEFAULT_POLITY_SYLLABUS = [
  { tag: 'GS2-P1-L1', title: 'Fundamental Rights' },
  { tag: 'GS2-P1-L2', title: 'Constitutionalism' },
  { tag: 'GS2-P1-L3', title: 'Preamble and its Significance' },
  { tag: 'GS2-P1-L4', title: 'Union and its Territory' },
  { tag: 'GS2-P1-L5', title: 'Centre-State Relations' },
];

export async function generateTopicContent(topicTag: string, topicTitle: string): Promise<{
  definitions: string[];
  key_concepts: { title: string; body: string }[];
  pyqs: { year: number; question: string; answer: string }[];
  common_traps: string[];
  summary: string;
  source_url: string;
}> {
  const prompt = `Write UPSC-focused chapter content for the topic "${topicTitle}" (syllabus tag ${topicTag}).

Rules:
- Write for 10th-class readability
- Focus on concepts, not rote memorization
- Include definitions, key concepts with examples, common traps, and a concise summary
- Include at least 2 previous year question hints with concise answers

Format JSON:
{
  "definitions": ["string"],
  "key_concepts": [{"title":"string","body":"string"}],
  "pyqs": [{"year":number,"question":"string","answer":"string"}],
  "common_traps": ["string"],
  "summary": "string",
  "source_url": ""
}`;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: 'You are a UPSC content writer who creates structured, exam-relevant study material.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    maxTokens: 1800,
    jsonMode: true,
  });

  return JSON.parse(raw || '{}');
}

export async function seedPolityTopics(
  supabase: any,
): Promise<{ seeded: number; failed: number }> {
  let seeded = 0;
  let failed = 0;

  for (const chapter of DEFAULT_POLITY_SYLLABUS) {
    try {
      const content = await generateTopicContent(chapter.tag, chapter.title);
      const { error } = await supabase.from('topics').insert({
        title: chapter.title,
        subject: 'polity',
        syllabus_tag: chapter.tag,
        content,
        readability_score: 70,
        source_url: '',
      });
      if (error) {
        console.warn(`[Content Agent] Failed to seed ${chapter.tag}:`, error.message);
        failed++;
      } else {
        seeded++;
      }
    } catch (err: any) {
      console.warn(`[Content Agent] Generation failed for ${chapter.tag}:`, err.message);
      failed++;
    }
  }

  return { seeded, failed };
}

export { DEFAULT_POLITY_SYLLABUS };
