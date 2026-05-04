// Sprint 6 S6-3: teacher-coach helpers shared by API + worker.
// - Per-guide scope filter against the canonical UPSC syllabus tags.
// - Imagine-trigger heuristic (Rule 6: any struggle should produce a 3D-VFX
//   topic-imagination video, not just text reply).

import { aiChat } from '../ai-router';
import { prelimsGuide, mainsGuide, interviewGuide } from './guide-agents';

export type GuideType = 'prelims' | 'mains' | 'interview';

export const SCOPE_FILTER: Record<GuideType, string[]> = {
  // Prelims: GS Paper 1 + 2 (history, polity, geography, economy, environment, science, current affairs).
  prelims: [
    'history.', 'polity.', 'geography.', 'economy.', 'environment.', 'science.', 'current.',
  ],
  // Mains: GS 1-4 + essay + ethics. Same broad subjects but answer-writing depth.
  mains: [
    'history.', 'polity.', 'geography.', 'economy.', 'environment.', 'science.',
    'ethics.', 'essay.', 'governance.', 'social.', 'international.',
  ],
  // Interview: DAF + personality + current affairs + ethics + governance.
  interview: [
    'personality.', 'daf.', 'current.', 'ethics.', 'governance.', 'opinion.',
  ],
};

export function pickGuide(t: GuideType) {
  return t === 'mains' ? mainsGuide : t === 'interview' ? interviewGuide : prelimsGuide;
}

// Heuristic: should we proactively offer a 3D imagine-video for this user
// turn? Triggers when the user signals confusion or asks for visual help.
const STRUGGLE_PATTERNS = [
  /don'?t understand/i,
  /confus(?:ed|ing|ion)/i,
  /not getting/i,
  /samajh nahi/i,
  /can'?t visuali[sz]e/i,
  /show me/i,
  /explain (?:in 3d|with (?:visual|video|animation))/i,
  /what does .* look like/i,
  /imagine/i,
];

export interface ImagineHint {
  shouldTrigger: boolean;
  topicQuery: string | null;
  reason: string;
}

export function detectImagineHint(userMessage: string, fallbackTopic?: string | null): ImagineHint {
  const trimmed = (userMessage || '').trim();
  if (!trimmed) return { shouldTrigger: false, topicQuery: null, reason: 'empty input' };

  const matched = STRUGGLE_PATTERNS.find((re) => re.test(trimmed));
  if (matched) {
    // Strip the trigger phrase out of the topic query so "I don't understand the
    // Big Bang" becomes topicQuery="the Big Bang" (rough but works).
    const cleaned = trimmed
      .replace(/^(i\s+)?(don'?t|do not)\s+understand/i, '')
      .replace(/^(can\s+you\s+)?show me/i, '')
      .replace(/^explain\s+(in 3d|with (?:visual|video|animation))?/i, '')
      .replace(/^imagine\s+/i, '')
      .trim()
      .replace(/^[:,\-]+/, '')
      .trim();
    const topicQuery = cleaned.length >= 3 ? cleaned : (fallbackTopic || trimmed);
    return { shouldTrigger: true, topicQuery, reason: `struggle pattern matched: ${matched}` };
  }

  // Very short questions (<= 4 words) often signal the user can't formulate
  // their confusion — offering a visual is cheap value.
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount <= 4 && trimmed.endsWith('?')) {
    return { shouldTrigger: true, topicQuery: trimmed.replace(/\?$/, ''), reason: 'terse question' };
  }

  return { shouldTrigger: false, topicQuery: null, reason: 'no struggle signals' };
}

// Full coaching turn — produces the guide's reply for the chat UI.
// Uses GuideAgent.coach but with longer context (last N turns) and a higher
// token budget than the default 120-token nudge.
export async function runTeacherCoachTurn(
  guide: GuideType,
  context: {
    userMessage: string;
    history?: { role: 'user' | 'guide'; message: string }[];
    scopeFilter?: string[];
  },
): Promise<string> {
  const g = pickGuide(guide);
  const scope = context.scopeFilter ?? SCOPE_FILTER[guide];

  const historyText = (context.history ?? [])
    .slice(-8)
    .map((t) => `${t.role === 'user' ? 'STUDENT' : 'GUIDE'}: ${t.message}`)
    .join('\n');

  const prompt = [
    `Scope: this conversation is about UPSC ${guide.toUpperCase()} preparation.`,
    `You may discuss topics tagged with any of: ${scope.join(', ')}`,
    `Politely redirect off-syllabus queries back into scope.`,
    historyText ? `\nPrior turns:\n${historyText}` : '',
    `\nSTUDENT (now): ${context.userMessage}`,
    `\nReply in 4-7 sentences. Use bullet points if you list items. End with a single concrete next step.`,
  ].filter(Boolean).join('\n');

  return aiChat({
    messages: [
      { role: 'system', content: g.systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    maxTokens: 480,
  });
}
