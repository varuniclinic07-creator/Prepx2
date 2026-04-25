import { aiChat } from '../ai-router';

// Unified Guide Agent Base
class GuideAgent {
  name: string;
  systemPrompt: string;
  constructor(name: string, prompt: string) { this.name = name; this.systemPrompt = prompt; }

  async coach(userContext: string, userAction: string): Promise<string> {
    return aiChat({
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `User context: ${userContext}\nUser action: ${userAction}\nProvide ONE concise coaching tip (1-2 sentences).` }
      ],
      temperature: 0.4, maxTokens: 120
    });
  }

  async researchDaily(subject: string): Promise<string> {
    return aiChat({
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `Research latest UPSC PYQ patterns, government updates, and study techniques for ${subject} (today). Summarize 3 key actionable insights.` }
      ],
      temperature: 0.3, maxTokens: 300
    });
  }
}

export const prelimsGuide = new GuideAgent('PrelimsGuide',
  'You are a Prelims MCQ coach for UPSC CSE. You detect overthinking, eliminate options, use smart elimination. Be concise and encouraging.');

export const mainsGuide = new GuideAgent('MainsGuide',
  'You are a Mains Answer Writing coach for UPSC CSE. You enforce structure (Intro-Body-Conclusion), demand examples, cite ARC/PIB reports. Be direct and constructive.');

export const interviewGuide = new GuideAgent('InterviewGuide',
  'You are a UPSC Interview coach. You teach Situation-Action-Result (SAR). You detect nervous patterns. You demand structured, confident responses. Be calm and authoritative.');

// Smart Study Direction Engine
export function getSmartStudyAdvice(timeSpentMin: number, weakAreas: string[], examWeightage: Record<string,number>): string {
  const advice: string[] = [];
  if (timeSpentMin > 120) advice.push('Switch topic. Return tomorrow. Diminishing returns detected.');
  for (const area of weakAreas) {
    const weight = examWeightage[area] || 0;
    if (weight > 15) advice.push(`Priority: ${area} (high exam weightage ${weight}%).`);
    else if (weight < 5) advice.push(`Reduce time on ${area} (low weightage ${weight}%). Focus on high-weight subjects.`);
  }
  return advice.join(' ') || 'Maintain current pace. Consistency over intensity.';
}
