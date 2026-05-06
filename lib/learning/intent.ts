// Sprint 9-D Phase A — intent classifier.
//
// Five MVP intents per user directive. Regex-first (deterministic + cheap +
// testable). The query engine consumes the (intent, slot) pair to choose
// which retrieval path to run. No LLM in this layer.

export type QueryIntent =
  | 'what-is'         // "What is X?", "define X", "explain X"
  | 'explain-again'   // "explain again", "didn't get it", "repeat"
  | 'show-formula'    // "show formula", "what's the equation"
  | 'jump-to-topic'   // "jump to X", "skip to Y", "go to part about Z"
  | 'give-recap';     // "recap", "summarise", "tldr"

export interface ClassifiedQuery {
  intent: QueryIntent;
  // Best-guess subject term extracted from the question. For 'what-is',
  // 'show-formula', and 'jump-to-topic' this is the concept the engine
  // searches against. For 'explain-again' / 'give-recap' it is the empty
  // string when the question carries no subject.
  subject: string;
  // Normalized form of the original q (lowercased, punctuation stripped) —
  // useful for the engine's keyword overlap step.
  normalized: string;
  // Confidence band the regex match landed in. 'low' means the engine
  // should fall back to keyword overlap against the concept index instead
  // of trusting the intent verbatim.
  confidence: 'high' | 'medium' | 'low';
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did',
  'of', 'in', 'on', 'to', 'for', 'with', 'and', 'or', 'but', 'so',
  'this', 'that', 'these', 'those', 'it', 'its', 'be', 'by', 'as',
  'i', 'you', 'we', 'us', 'me', 'my', 'your', 'our', 'their',
  'please', 'kindly', 'can', 'could', 'would', 'should', 'will',
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(s: string): string[] {
  return normalize(s).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function classify(q: string): ClassifiedQuery {
  const norm = normalize(q);

  // ── give-recap (highest priority — short trigger words) ────────────
  if (/\b(recap|tldr|summari[sz]e|summary|in short|wrap up)\b/.test(norm)) {
    return { intent: 'give-recap', subject: '', normalized: norm, confidence: 'high' };
  }

  // ── explain-again ──────────────────────────────────────────────────
  if (
    /\b(explain again|repeat|say again|didn t get it|didnt get|once more|one more time|i don t understand|i dont understand|can you re explain)\b/.test(norm)
  ) {
    return { intent: 'explain-again', subject: '', normalized: norm, confidence: 'high' };
  }

  // ── show-formula ──────────────────────────────────────────────────
  const formulaMatch = /\b(show|give|what s|whats|what is|tell me)\b.*\b(formula|equation|expression)\b\s*(?:for|of)?\s*(.*)$/.exec(norm);
  if (formulaMatch || /\b(formula|equation)\b/.test(norm)) {
    const subjectFromMatch = formulaMatch?.[3]?.trim() || '';
    const subject = subjectFromMatch || norm.replace(/\b(formula|equation|show|give|tell|me|what|s|for|of)\b/g, '').trim();
    return { intent: 'show-formula', subject, normalized: norm, confidence: 'high' };
  }

  // ── jump-to-topic ──────────────────────────────────────────────────
  const jumpMatch = /\b(jump to|skip to|go to|take me to|show me|fast forward to)\s+(.+)$/.exec(norm);
  if (jumpMatch) {
    return {
      intent: 'jump-to-topic',
      subject: jumpMatch[2].replace(/^the\s+/, '').replace(/^part about\s+/, '').trim(),
      normalized: norm,
      confidence: 'high',
    };
  }

  // ── what-is (catch-all for definitional questions) ─────────────────
  const whatMatch = /\b(what is|what s|whats|define|explain|describe|tell me about|meaning of|what does|how does)\s+(.+?)(?:\s+mean)?\??$/.exec(norm);
  if (whatMatch) {
    return {
      intent: 'what-is',
      subject: whatMatch[2].replace(/^the\s+/, '').trim(),
      normalized: norm,
      confidence: 'high',
    };
  }

  // ── fallback ───────────────────────────────────────────────────────
  // Treat as 'what-is' against the entire normalized query; engine will
  // fall back to keyword overlap and may return low-confidence match.
  return {
    intent: 'what-is',
    subject: norm,
    normalized: norm,
    confidence: 'low',
  };
}
