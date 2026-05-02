// Shared Flesch-Kincaid grade-level calculator.
// Used by lib/agents/script-writer.ts and lib/agents/chapter-writer.ts so we
// validate generated content with the same rule everywhere.

export function fleschKincaidGrade(text: string): number | null {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (sentences === 0 || words.length === 0) return null;
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const grade = (0.39 * (words.length / sentences))
    + (11.8 * (syllables / words.length))
    - 15.59;
  return Math.round(grade * 10) / 10;
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g) || [];
  let count = groups.length;
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}
